export default class Queue {
    constructor() {
        this.elements = new Map();
        this.head = 0;
        this.tail = 0;
    }

    push(item) {
        this.elements.set(this.tail, item);
        ++this.tail;
    }

    pop() {
        if (this.isEmpty) return null;
        const item = this.elements.get(this.head);
        this.elements.delete(this.head);
        ++this.head;
        return item;
    }

    front() {
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
