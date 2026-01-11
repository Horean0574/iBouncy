const {
    Group,
    Rect,
    Ellipse,
    Polygon,
    Path,
    Resource,
    ResizeEvent,
    KeyEvent,
    AnimateEvent,
    Text,
    Keyboard,
} = LeaferUI;

const D = Math.abs;
const C = Math.ceil;
const F = Math.floor;
const GP = new GameProcessor({
    refreshRate: 60,
    actUnitInterval: 16.7,
    stdUnitInterval: 16.7,
    fixedStep: 16.7,
    maxStepPerFrame: 10,
    paddingTop: 80,
    paddingSide: 40,
    timeLimit: 180,
});

const leafer = new Leafer({
    view: window,
    fill: "#EFF",
});

const Mask = new E_Mask();
const Settlement = new E_Settlement();
const FPS = new E_FPS();
const ForbiddenZone = new E_ForbiddenZone();
const Timing = new E_Timing();
const Scoring = new E_Scoring();
const Tablet = new E_Tablet();
const Ball = new E_Ball();

Scoring.init();
Settlement.init();

ForbiddenZone.render();
Tablet.render();
Ball.render();
Timing.render();
Scoring.render();
FPS.render();

const GI = new GameInteraction();
let prevTimeStamp;
let accumulated = 0;
let timer = new EmbeddedTimer({
    minInterval: 0,
    autoHandleFPS: true,
});
beforeStart();
requestAnimationFrame(firstFrame);

timer.newInterval(() => FPS.assign(timer.FPS), 400);

function beforeStart() {
    Timing.reset();
    Tablet.reset();
    Ball.reset();
}

function resetGame() {
    Mask.cull();
    Settlement.cull();
    Timing.reset();
    Scoring.reset();
    Tablet.reset();
    Ball.reset();
}

function firstFrame(timeStamp) {
    prevTimeStamp = timeStamp;
    gameLoop(timeStamp);
}

function gameLoop(timeStamp) {
    const deltaTime = timeStamp - prevTimeStamp;
    prevTimeStamp = timeStamp;
    timer.timeDetect(timeStamp);

    GP.at("init1") && GP.measureRefreshRate(deltaTime / GP.ENV.stdUnitInterval);
    if (GP.at("init2")) {
        Ball.prepare();
        GP.state("prepared");
    }

    let steps = 1;
    if (GP.at("playing")) {
        accumulated += Math.min(deltaTime, 3000); // can redisplay frames of up to 3s
        Ball.timeDivisor = Math.min(F(accumulated / GP.ENV.fixedStep), GP.ENV.maxStepPerFrame);
        while (accumulated >= GP.ENV.fixedStep && steps <= GP.ENV.maxStepPerFrame) { // sub-stepping loop
            accumulated -= GP.ENV.fixedStep;
            ++steps;
            const unitProg = GP.ENV.fixedStep / GP.ENV.stdUnitInterval;
            Ball.frameLoop(unitProg);
            Tablet.frameLoop(unitProg);
            if (GI.collisionDetect() && Ball.vy < 0) {
                const bv = Math.sqrt(Ball.vx ** 2 + Ball.vy ** 2);
                const bvP = Math.log2(bv) + 1 / Math.cos(Math.PI / 20 * bv);
                const d = D(Tablet.cx - Ball.cx);
                const dP = Math.cos(Math.PI / Tablet.w * 2 * d) + 0.5;
                Scoring.tip(Scoring.delta(0.7 * bvP + 0.3 * dP));
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        GP.pause();
    } else {
        GP.resume();
    }
});
leafer.on(ResizeEvent.RESIZE, function (e) {
    Mask.relocate(e);
    Settlement.relocate(e);
    FPS.relocate(e);
    ForbiddenZone.relocate(e);
    Scoring.relocate(e);
});
leafer.on(KeyEvent.HOLD, function (e) {
    e.code === "Semicolon" && FPS.toggle();
});
leafer.on(KeyEvent.UP, function (e) {
    if (e.code === "Space") {
        if (GP.at("prepared")) {
            GP.state("playing");
            Timing.start();
        } else if (GP.at("over")) {
            resetGame();
            GP.state("playing");
            Timing.start();
        }
    }
});
