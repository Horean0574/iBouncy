export default class Queue<T = any> {
  private elements = new Map<number, T>();
  private head = 0;
  private tail = 0;

  push(item: T) {
    this.elements.set(this.tail, item);
    ++this.tail;
  }

  pop(): T | null {
    if (this.isEmpty) return null;
    const item = this.elements.get(this.head) as T;
    this.elements.delete(this.head);
    ++this.head;
    return item;
  }

  front(): T | undefined {
    return this.elements.get(this.head);
  }

  clear() {
    this.elements.clear();
    this.head = this.tail = 0;
  }

  get length() {
    return this.tail - this.head;
  }

  get isEmpty() {
    return this.length === 0;
  }
}

