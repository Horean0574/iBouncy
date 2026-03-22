import type { PoolClient } from "pg";
import { toDateKey } from "./http.js";

type GameInput = {
  userId: number;
  score: number;
  durationSec?: number;
  playedAt?: Date;
};

export const DAILY_TASK_DEFINITIONS = [
  { taskType: "play_3_games", title: "玩 3 局游戏", target: 3, rewardPoints: 20 },
  { taskType: "score_over_30", title: "单次得分达到 30 分", target: 1, rewardPoints: 30 },
  { taskType: "share_once", title: "分享成绩 1 次", target: 1, rewardPoints: 25 }
] as const;

export const LEVEL_UNLOCKS = [
  { level: 2, key: "theme_ocean", name: "海洋主题" },
  { level: 3, key: "multi_ball_mode", name: "多球模式" },
  { level: 5, key: "special_stage", name: "特殊关卡" }
] as const;

export function getLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, Number(totalXp) || 0);
  return Math.floor(Math.sqrt(xp / 120)) + 1;
}

export function getXpToNextLevel(level: number): number {
  const safeLevel = Math.max(1, Number(level) || 1);
  const next = safeLevel + 1;
  return next * next * 120;
}

export async function ensureUserProgressRow(client: PoolClient, userId: number): Promise<void> {
  await client.query(`INSERT INTO user_progress (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
}

export async function ensureDailyTasks(client: PoolClient, userId: number, dateKey: string = toDateKey()): Promise<void> {
  for (const task of DAILY_TASK_DEFINITIONS) {
    await client.query(
      `
            INSERT INTO user_daily_tasks (user_id, task_date, task_type, title, target, reward_points)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, task_date, task_type) DO NOTHING
            `,
      [userId, dateKey, task.taskType, task.title, task.target, task.rewardPoints]
    );
  }
}

export async function markShareTaskProgress(client: PoolClient, userId: number, dateKey: string = toDateKey()): Promise<void> {
  await ensureDailyTasks(client, userId, dateKey);
  await client.query(
    `
        UPDATE user_daily_tasks
        SET progress = target,
            status = CASE WHEN status = 'claimed' THEN status ELSE 'completed' END,
            updated_at = NOW()
        WHERE user_id = $1 AND task_date = $2 AND task_type = 'share_once'
        `,
    [userId, dateKey]
  );
}

export async function applyGameIncentives(client: PoolClient, input: GameInput): Promise<{ gainedXp: number; level: number }> {
  const { userId, score, durationSec = 0, playedAt = new Date() } = input;
  const safeScore = Number(score) || 0;
  const safeDuration = Math.max(0, Math.floor(Number(durationSec) || 0));
  const dateKey = toDateKey(playedAt);

  await ensureUserProgressRow(client, userId);
  await ensureDailyTasks(client, userId, dateKey);

  const gainedXp = Math.max(5, Math.floor(safeScore * 2) + Math.floor(safeDuration / 15));
  const progressRes = await client.query<{ total_xp: string }>(
    `
        UPDATE user_progress
        SET total_score = total_score + $2,
            total_play_time_sec = total_play_time_sec + $3,
            total_games = total_games + 1,
            total_xp = total_xp + $4,
            updated_at = NOW()
        WHERE user_id = $1
        RETURNING total_xp
        `,
    [userId, safeScore, safeDuration, gainedXp]
  );
  const totalXp = Number(progressRes.rows[0]?.total_xp || 0);
  const newLevel = getLevelFromXp(totalXp);
  await client.query(`UPDATE user_progress SET level = $2 WHERE user_id = $1`, [userId, newLevel]);

  await client.query(
    `
        UPDATE user_daily_tasks
        SET progress = LEAST(target, progress + 1),
            status = CASE
                WHEN status = 'claimed' THEN status
                WHEN LEAST(target, progress + 1) >= target THEN 'completed'
                ELSE status
            END,
            updated_at = NOW()
        WHERE user_id = $1 AND task_date = $2 AND task_type = 'play_3_games'
        `,
    [userId, dateKey]
  );

  if (safeScore >= 30) {
    await client.query(
      `
            UPDATE user_daily_tasks
            SET progress = target,
                status = CASE WHEN status = 'claimed' THEN status ELSE 'completed' END,
                updated_at = NOW()
            WHERE user_id = $1 AND task_date = $2 AND task_type = 'score_over_30'
            `,
      [userId, dateKey]
    );
  }

  return { gainedXp, level: newLevel };
}

export async function claimDailyTaskReward(
  client: PoolClient,
  userId: number,
  taskType: string,
  dateKey: string = toDateKey()
): Promise<number> {
  await ensureDailyTasks(client, userId, dateKey);
  const taskRes = await client.query<{ status: string; reward_points: string }>(
    `
        SELECT task_type, status, reward_points
        FROM user_daily_tasks
        WHERE user_id = $1 AND task_date = $2 AND task_type = $3
        LIMIT 1
        `,
    [userId, dateKey, taskType]
  );
  const task = taskRes.rows[0];
  if (!task) throw new Error("任务不存在");
  if (task.status === "claimed") throw new Error("任务奖励已领取");
  if (task.status !== "completed") throw new Error("任务尚未完成");

  const reward = Number(task.reward_points || 0);
  await ensureUserProgressRow(client, userId);
  await client.query(
    `
        INSERT INTO user_points_ledger (user_id, source, delta, ref_type, ref_id)
        VALUES ($1, 'task', $2, 'daily_task', $3)
        ON CONFLICT (user_id, source, ref_type, ref_id) DO NOTHING
        `,
    [userId, reward, `${dateKey}:${taskType}`]
  );
  await client.query(`UPDATE user_progress SET points = points + $2, updated_at = NOW() WHERE user_id = $1`, [userId, reward]);
  await client.query(
    `
        UPDATE user_daily_tasks
        SET status = 'claimed', claimed_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND task_date = $2 AND task_type = $3
        `,
    [userId, dateKey, taskType]
  );

  return reward;
}
