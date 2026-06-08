import { describe, expect, it } from "vitest";
import { WriteQueue } from "../src/core/WriteQueue";

describe("WriteQueue", () => {
  it("executes one task", async () => {
    const queue = new WriteQueue();
    let executed = false;

    await queue.enqueue(() => {
      executed = true;
    });

    expect(executed).toBe(true);
  });

  it("executes tasks in order", async () => {
    const queue = new WriteQueue();
    const order: number[] = [];

    await Promise.all([
      queue.enqueue(async () => {
        await delay(10);
        order.push(1);
      }),
      queue.enqueue(() => {
        order.push(2);
      }),
      queue.enqueue(() => {
        order.push(3);
      }),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("returns task result", async () => {
    const queue = new WriteQueue();

    await expect(queue.enqueue(() => "OK")).resolves.toBe("OK");
  });

  it("continues after a successful task", async () => {
    const queue = new WriteQueue();

    await queue.enqueue(() => "first");

    await expect(queue.enqueue(() => "second")).resolves.toBe("second");
  });

  it("propagates task errors", async () => {
    const queue = new WriteQueue();
    const error = new Error("write failed");

    await expect(
      queue.enqueue(() => {
        throw error;
      })
    ).rejects.toBe(error);
  });

  it("continues working after a failed task", async () => {
    const queue = new WriteQueue();

    await queue
      .enqueue(() => {
        throw new Error("write failed");
      })
      .catch(() => undefined);

    await expect(queue.enqueue(() => "recovered")).resolves.toBe("recovered");
  });

  it("handles many queued tasks", async () => {
    const queue = new WriteQueue();
    const values: number[] = [];
    const tasks = Array.from({ length: 50 }, (_, index) =>
      queue.enqueue(() => {
        values.push(index);
        return index;
      })
    );

    await expect(Promise.all(tasks)).resolves.toHaveLength(50);
    expect(values).toEqual(Array.from({ length: 50 }, (_, index) => index));
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
