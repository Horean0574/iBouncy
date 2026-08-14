export default class Queue<T> {
    private readonly elements = new Map<number, T>();
    private head = 0;
    private tail = 0;

    push(item: T): void {
        this.elements.set(this.tail, item);
        ++this.tail;
    }

    pop(): T | null {
        if (this.isEmpty) return null;
        const item = this.elements.get(this.head);
        this.elements.delete(this.head);
        ++this.head;
        return item ?? null;
    }

    front(): T | undefined {
        return this.elements.get(this.head);
    }

    clear(): void {
        this.elements.clear();
        this.head = this.tail = 0;
    }

    get length(): number {
        return this.tail - this.head;
    }

    get isEmpty(): boolean {
        return this.length === 0;
    }
}
