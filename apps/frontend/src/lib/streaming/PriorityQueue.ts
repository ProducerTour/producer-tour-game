/**
 * Priority Queue Implementation
 *
 * Min-heap based priority queue for chunk loading.
 * Lower priority values = higher loading priority.
 *
 * @module streaming/PriorityQueue
 */

/**
 * Item in the priority queue
 */
interface QueueItem<T> {
  item: T;
  priority: number;
}

/**
 * Min-heap based priority queue.
 * Items with lower priority values are dequeued first.
 */
export class PriorityQueue<T> {
  private heap: QueueItem<T>[] = [];
  private itemMap: Map<T, number> = new Map(); // item -> heap index

  /**
   * Get the number of items in the queue
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Check if an item is in the queue
   */
  contains(item: T): boolean {
    return this.itemMap.has(item);
  }

  /**
   * Add an item to the queue with a priority.
   * If the item already exists, updates its priority.
   *
   * @param item Item to add
   * @param priority Priority value (lower = higher priority)
   */
  enqueue(item: T, priority: number): void {
    if (this.itemMap.has(item)) {
      this.updatePriority(item, priority);
      return;
    }

    const queueItem: QueueItem<T> = { item, priority };
    this.heap.push(queueItem);
    const index = this.heap.length - 1;
    this.itemMap.set(item, index);
    this.bubbleUp(index);
  }

  /**
   * Remove and return the item with the lowest priority value
   *
   * @returns The item with highest priority, or null if empty
   */
  dequeue(): T | null {
    if (this.heap.length === 0) return null;

    const min = this.heap[0];
    const last = this.heap.pop()!;
    this.itemMap.delete(min.item);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.itemMap.set(last.item, 0);
      this.bubbleDown(0);
    }

    return min.item;
  }

  /**
   * Peek at the item with the lowest priority without removing it
   *
   * @returns The item with highest priority, or null if empty
   */
  peek(): T | null {
    return this.heap.length > 0 ? this.heap[0].item : null;
  }

  /**
   * Get the priority of the next item to be dequeued
   *
   * @returns Priority value, or Infinity if empty
   */
  peekPriority(): number {
    return this.heap.length > 0 ? this.heap[0].priority : Infinity;
  }

  /**
   * Update the priority of an existing item
   *
   * @param item Item to update
   * @param newPriority New priority value
   * @returns true if item was found and updated
   */
  updatePriority(item: T, newPriority: number): boolean {
    const index = this.itemMap.get(item);
    if (index === undefined) return false;

    const oldPriority = this.heap[index].priority;
    this.heap[index].priority = newPriority;

    if (newPriority < oldPriority) {
      this.bubbleUp(index);
    } else if (newPriority > oldPriority) {
      this.bubbleDown(index);
    }

    return true;
  }

  /**
   * Remove a specific item from the queue
   *
   * @param item Item to remove
   * @returns true if item was found and removed
   */
  remove(item: T): boolean {
    const index = this.itemMap.get(item);
    if (index === undefined) return false;

    // Move item to top by giving it lowest priority
    this.heap[index].priority = -Infinity;
    this.bubbleUp(index);

    // Then dequeue it
    this.dequeue();
    return true;
  }

  /**
   * Get all items in the queue (not in priority order)
   */
  getItems(): T[] {
    return this.heap.map((qi) => qi.item);
  }

  /**
   * Get all items with their priorities, sorted by priority
   */
  getSortedItems(): Array<{ item: T; priority: number }> {
    return [...this.heap]
      .sort((a, b) => a.priority - b.priority)
      .map(({ item, priority }) => ({ item, priority }));
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.heap = [];
    this.itemMap.clear();
  }

  /**
   * Move an item up the heap until heap property is restored
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.heap[parentIndex].priority <= this.heap[index].priority) {
        break;
      }

      this.swap(parentIndex, index);
      index = parentIndex;
    }
  }

  /**
   * Move an item down the heap until heap property is restored
   */
  private bubbleDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < length &&
        this.heap[leftChild].priority < this.heap[smallest].priority
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < length &&
        this.heap[rightChild].priority < this.heap[smallest].priority
      ) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      this.swap(smallest, index);
      index = smallest;
    }
  }

  /**
   * Swap two items in the heap and update the index map
   */
  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.itemMap.set(this.heap[i].item, i);
    this.itemMap.set(this.heap[j].item, j);
  }
}

/**
 * Specialized priority queue for chunk IDs.
 * Provides additional methods specific to chunk management.
 */
export class ChunkPriorityQueue extends PriorityQueue<string> {
  /**
   * Bulk update priorities for multiple chunks
   *
   * @param updates Map of chunk ID to new priority
   */
  bulkUpdatePriorities(updates: Map<string, number>): void {
    for (const [chunkId, priority] of updates) {
      if (this.contains(chunkId)) {
        this.updatePriority(chunkId, priority);
      }
    }
  }

  /**
   * Enqueue multiple chunks at once
   *
   * @param chunks Array of [chunkId, priority] pairs
   */
  enqueueMany(chunks: Array<[string, number]>): void {
    for (const [chunkId, priority] of chunks) {
      this.enqueue(chunkId, priority);
    }
  }

  /**
   * Dequeue up to N items
   *
   * @param maxItems Maximum number of items to dequeue
   * @returns Array of dequeued chunk IDs
   */
  dequeueMany(maxItems: number): string[] {
    const results: string[] = [];
    for (let i = 0; i < maxItems && !this.isEmpty(); i++) {
      const item = this.dequeue();
      if (item) results.push(item);
    }
    return results;
  }

  /**
   * Get chunks within a priority threshold
   *
   * @param maxPriority Maximum priority value to include
   * @returns Array of chunk IDs with priority <= maxPriority
   */
  getChunksWithinPriority(maxPriority: number): string[] {
    return this.getSortedItems()
      .filter(({ priority }) => priority <= maxPriority)
      .map(({ item }) => item);
  }
}
