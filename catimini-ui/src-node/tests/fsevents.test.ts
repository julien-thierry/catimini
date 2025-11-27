import { InvokeArgs } from '@tauri-apps/api/core';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { emit } from '@tauri-apps/api/event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import FSEvents from "../fsevents";

declare const window: any;

describe("FSEvents", () => {

async function mockInvoke(cmd: string, args: InvokeArgs | undefined) {
    if (cmd == "enable_directory_notifications" || cmd == "disable_directory_notifications") {
        if (args && typeof args === typeof {path: ""}) {
          return (args as {path: string}).path.length > 0;
        }
        return false;
    }
}

beforeEach(() => {
    mockIPC(mockInvoke, {shouldMockEvents: true});
});
afterEach(() => clearMocks());

test('should enable notifications only once per directory', async () => {
    const listeningContext = new FSEvents.FSListeningContext();

    const invokeSpy = vi.spyOn(window.__TAURI_INTERNALS__, "invoke");
    const unregisterListener1 = await listeningContext.registerListener("dir1", () => {});
    expect(invokeSpy).toHaveBeenCalledTimes(2);
    expect(invokeSpy).toHaveBeenNthCalledWith(1, "plugin:event|listen", expect.objectContaining({event: "filesystem-event-create"}), undefined);
    expect(invokeSpy).toHaveBeenNthCalledWith(2, "enable_directory_notifications", {path: "dir1"}, undefined);

    invokeSpy.mockClear();

    const unregisterListener2 = await listeningContext.registerListener("dir1", () => {});
    expect(invokeSpy).not.toHaveBeenCalled();

    const unregisterListener3 = await listeningContext.registerListener("dir2", () => {});
    expect(invokeSpy).toHaveBeenCalledExactlyOnceWith("enable_directory_notifications", {path: "dir2"}, undefined);

    invokeSpy.mockClear();

    await unregisterListener1();
    await unregisterListener3();
    expect(invokeSpy).toHaveBeenCalledExactlyOnceWith("disable_directory_notifications", {path: "dir2"}, undefined);

    invokeSpy.mockClear();

    await unregisterListener2();
    expect(invokeSpy).toHaveBeenCalledTimes(2);
    expect(invokeSpy).toHaveBeenNthCalledWith(1, "disable_directory_notifications", {path: "dir1"}, undefined);
    expect(invokeSpy).toHaveBeenNthCalledWith(2, "plugin:event|unlisten", expect.objectContaining({event: "filesystem-event-create"}), undefined);

});

test("should call corresponding handlers for creation events" , async () => {
    const listeningContext = new FSEvents.FSListeningContext();

    const listener1 = vi.fn();
    const unregisterListener1 = await listeningContext.registerListener("dir1", listener1);

    const listener2 = vi.fn();
    const unregisterListener2 = await listeningContext.registerListener("dir1", listener2);

    const listener3 = vi.fn();
    const unregisterListener3 = await listeningContext.registerListener("dir2", listener3);

    const createEventDir1 = {parentDir: "dir1", createdContent: {folders: ["dummy"], images: [], others: []}};
    await emit('filesystem-event-create', createEventDir1);
    expect(listener1).toHaveBeenCalledExactlyOnceWith({type: "create", ...createEventDir1}, "dir1");
    expect(listener2).toHaveBeenCalledExactlyOnceWith({type: "create", ...createEventDir1}, "dir1");
    expect(listener3).not.toHaveBeenCalled();

    listener1.mockClear();
    listener2.mockClear();

    const createEventDir2 = {parentDir: "dir2", createdContent: {folders: ["dummy"], images: [], others: []}};
    await emit('filesystem-event-create', createEventDir2);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
    expect(listener3).toHaveBeenCalledExactlyOnceWith({type: "create", ...createEventDir2}, "dir2");

    listener3.mockClear();

    await unregisterListener1();
    await emit('filesystem-event-create', createEventDir1);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledExactlyOnceWith({type: "create", ...createEventDir1}, "dir1");
    expect(listener3).not.toHaveBeenCalled();

    listener2.mockClear();

    await unregisterListener2();
    await unregisterListener3();

    await emit('filesystem-event-create', createEventDir2);
    await emit('filesystem-event-create', createEventDir1);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
    expect(listener3).not.toHaveBeenCalled();
});

});