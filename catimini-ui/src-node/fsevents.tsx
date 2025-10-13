import { createContext, useContext, useEffect } from 'react';
import { Event, listen, UnlistenFn } from '@tauri-apps/api/event';

import Commands from './commands';
import Utils from './utils';

export namespace FSEvents
{

export type FSCreateFileEvent = {
    parentDir: string,
    createdContent: Commands.FolderContent
}

export type FSEvent = { type: 'create' }  & FSCreateFileEvent

export type FSEventListener = (e: FSEvent) => void;

async function start_listen(handler: (e: Event<FSCreateFileEvent>) => void) : Promise<UnlistenFn> {
    const unlistenFSCreate = await listen<FSCreateFileEvent>('filesystem-event-create', handler);

    return unlistenFSCreate;
}

function enableDirectoryNotifications(p: string) : Promise<void> {
    return new Promise((resolve, reject) => {
        Commands.enableDirectoryNotifications(p).then((v) => v ? resolve() : reject())
                                                .catch(reject);
    });
}

function disableDirectoryNotifications(p: string) : Promise<void> {
    return new Promise((resolve, reject) => {
        Commands.disableDirectoryNotifications(p).then((v) => v ? resolve() : reject())
                                                .catch(reject);
    });
}

type FSEventListenerHandle = {
    id: string,
    targetDir: string
}

const nullHandleId = crypto.randomUUID();

export type UnregisterListenerFn = () => Promise<void>;

export class FSListeningContext {
    async registerListener(targetDir: string, listener: FSEventListener) : Promise<UnregisterListenerFn> {
        const handle = await this.add_listener(targetDir, listener);

        return async () => { await this.remove_listener(handle); };
    }

    private async add_listener(targetDir: string, listener: FSEventListener): Promise<FSEventListenerHandle> {
        let handle = {id: nullHandleId, targetDir: targetDir};

        try {
            await this.lock.acquire();
        } catch (e) {
            return handle;
        }

        try {
            if (this.fsListeners.size <= 0) {
                this.stop_listen = await start_listen((e) => this.handle_create_event(e));
            }

            let dirMap = this.fsListeners.get(targetDir);
            if (!dirMap) {
                try {
                    await enableDirectoryNotifications(targetDir);
                    dirMap = new Map();
                    this.fsListeners.set(targetDir, dirMap);
                } catch (e) {
                    if (this.fsListeners.size <= 0) {
                        this.stop_listen();
                    }
                }
            }

            if (dirMap) {
                handle = {id: crypto.randomUUID(), targetDir: targetDir};
                dirMap.set(handle.id, listener);
            }
        } catch (e) {
            console.error("Error adding FSEvent listener: ", e);
        }
        this.lock.release();

        return handle;
    }

    private async remove_listener(handle: FSEventListenerHandle) {
        if (handle.id === nullHandleId) {
            return;
        }

        await this.lock.acquire().then(async () => {
            try {
                const dirMap = this.fsListeners.get(handle.targetDir);
                if (dirMap) {
                    if (dirMap.delete(handle.id) && dirMap.size <= 0) {
                        this.fsListeners.delete(handle.targetDir);
                        await disableDirectoryNotifications(handle.targetDir);
                    }
                }
                if (this.fsListeners.size <= 0) {
                    this.stop_listen();
                }
            } catch (e) {
                console.log("exception during removing: ", e);
            }
            this.lock.release();
        });
    }

    private handle_create_event(event: Event<FSCreateFileEvent>) {
        const fsEvent : FSEvent = {
            type: 'create',
            parentDir: event.payload.parentDir,
            createdContent: event.payload.createdContent
        };

        for (let listener of this.fsListeners.get(fsEvent.parentDir) || []) {
            listener[1](fsEvent);
        }
    }

    private fsListeners: Map<string, Map<string, FSEventListener>> = new Map();
    private stop_listen: UnlistenFn = () => {};
    private lock: Utils.Lock = new Utils.Lock();
};

export const FSEventsListeningContext = createContext<FSListeningContext | null>(null);

export function FolderListener({path, fsEventCB} : {path: string, fsEventCB: FSEvents.FSEventListener}) {
    const fsListeningContext = useContext(FSEventsListeningContext);
    useEffect(() => {
        const registerListener = async () => {
            if (fsListeningContext) {
                return await fsListeningContext.registerListener(path, fsEventCB);
            }
            return () => {};
        }

        const unregister = registerListener();
        return () => { unregister.then(async v => await v()) };
    }, [path, fsEventCB, fsListeningContext]);

    return <></>;
}

}

export default FSEvents;
