import { useEffect, useState, useRef } from "react";
import { FaFolder, FaFolderMinus, FaFolderPlus } from "react-icons/fa";

import "./SelectableFileTree.css"

import Commands from "./commands";
import Utils from "./utils";

function SelectableFileItem({path, id, icon, isSelected, onClick, style} :
                            {
                                path: string,
                                id: string,
                                icon: React.ReactElement,
                                isSelected: boolean,
                                onClick: (e: React.MouseEvent<Element, MouseEvent>, path: string, id: string) => void,
                                style? : React.CSSProperties,
                            }
                            ) {

    function handleItemClick(e: React.MouseEvent<Element, MouseEvent>) {
        onClick(e, path, id);
    }

    return (
        <li className={"filetreeitem" + (isSelected ? " selected" : "")} style={style} onClick={handleItemClick}>
            {icon}
            <div data-testid="filename" onClick={(_) => { /* Let event bubble to parent */ }} style={{display:"inline-block", marginLeft: "5px"}}>
                {Utils.fileBasename(path)}
            </div>
        </li>
    );
}

type FileItem = {
    id: string,
    path: string,
    content: Commands.FolderContent,
    open: boolean,
    selected: boolean,
    nesting: number
}

function fileCmpFn(a: string, b: string) {
    return a.localeCompare(b);
}

function newFolderItem(path: string, content: Commands.FolderContent, parent?: FileItem) : FileItem {
    content.folders.sort(fileCmpFn);
    content.images.sort(fileCmpFn);
    content.others.sort(fileCmpFn);

    return {
        id: crypto.randomUUID(),
        path,
        content: content,
        open: false,
        selected: false,
        nesting: parent ? parent.nesting + 1 : 0
    };
}

function FolderItemIcon({item, onClick} :
                      {
                        item: FileItem,
                        onClick?: (e: React.MouseEvent<Element, MouseEvent>, p: string, id: string) => void
                      }) {
    function handleIconClick(e: React.MouseEvent<Element, MouseEvent>) {
        if (onClick) {
            e.stopPropagation();
            onClick(e, item.path, item.id);
        }
    }

    if (item.content.folders.length > 0) {
        // On Linux, svg can be "not clickable" causing tests to fail, so wrap the icon in a clickable div
        return (
            <div data-testid="clickable-icon" onClick={handleIconClick} style={{display: "inline-block"}}>
                {item.open ? (<FaFolderMinus size={14}/>) : (<FaFolderPlus size={14}/>)}
            </div>
        );
    }
    return <FaFolder size={14}/>;
}

function SelectableFileTree({rootPaths, onSelectListUpdate, className, style} :
                            {
                                rootPaths : Array<string>,
                                onSelectListUpdate : (folderInfo: Array<Utils.FolderInfo>) => void,
                                className? : string,
                                style? : React.CSSProperties,
                            }) {
    const [fileItems, setFileItems] = useState<Array<FileItem>>([]);
    const [lastRootPaths, setLastRootPaths] = useState<Array<string>>([]);

    function requestFolderItems(paths : Array<string>, parent? : FileItem) : Promise<Array<PromiseSettledResult<FileItem>>> {
        return Promise.allSettled(paths.map(async (e) => newFolderItem(e, await Commands.getFolderContent(e), parent)));
    }

    function createFolderItems(folderResults: Array<PromiseSettledResult<FileItem>>) : Array<FileItem> {
        return folderResults.flatMap((result) => {
            if (result.status == "fulfilled") {
                return [result.value]
            } else {
                console.warn(result.reason);
                return [];
            }
        });
    }

    const [selectedList, setSelectedList] = useState<Array<Utils.FolderInfo>>([]);
    const lastSelectedElementRef = useRef<string | null>(null);
    function updateItemList(updater: (fi: Array<FileItem>) =>  [Array<FileItem>, boolean]) {
        setFileItems((fi) => {
            const [newItemsList, updateSelected] = updater(fi);
            if (updateSelected) {
                const newSelectedList = newItemsList.filter((e) => e.selected);
                if (newSelectedList.length <= 0) {
                    lastSelectedElementRef.current = null;
                }
                setSelectedList(newSelectedList.map((e) => {return {path: e.path, content: e.content}}))
            }
            return newItemsList;
        })
    }

    if (rootPaths != lastRootPaths) {
        lastSelectedElementRef.current = null;
        setLastRootPaths(rootPaths);
        requestFolderItems(rootPaths)
            .then((folderResults) => updateItemList(() => [createFolderItems(folderResults), true]))
            .catch((e) => { console.warn("Failed to retrieve folders' contents. ", e); setFileItems([]) });
    }

    function toggleItemOpen(e: React.MouseEvent<Element, MouseEvent>, path: string, id: string) {
         if (e.button != 0) {
            return;
        }

        const itemIdx = fileItems.findIndex((v) => v.id == id);
        if (itemIdx < 0) {
            return;
        }

        const doOpen = !fileItems[itemIdx].open;

        updateItemList((fil) => {
            const itemIdx = fil.findIndex((v) => v.id == id);
            if (itemIdx < 0) {
                return [fil, false];
            }

            if (!doOpen) {
                if (!fil[itemIdx].open) {
                    return [fil, false];
                }
                // Close the file, remove all its childen fileitems from the list
                let nextIdx = Utils.findIndexInRange(fil, (v) => v.nesting <= fil[itemIdx].nesting, itemIdx + 1);
                if (nextIdx < 0) {
                    nextIdx = fil.length;
                }
                const updateSelected : boolean = Utils.findIndexInRange(fil, (e) => e.selected, itemIdx + 1, nextIdx) > 0;

                return [[...fil.slice(0, itemIdx), {...fil[itemIdx], open: false}, ...fil.slice(nextIdx)], updateSelected];
            } else {
                if (fil[itemIdx].open) {
                    return [fil, false];
                }

                // Open the file, create children file items and insert them right after the folder being opened
                requestFolderItems(fil[itemIdx].content.folders, fil[itemIdx])
                    .then((folderResults) => updateItemList((fil) => {
                        const itemIdx = fil.findIndex((v) => v.id == id);
                        if (itemIdx < 0 || !fil[itemIdx].open) {
                            return [fil, false];
                        }

                        let itemContentEndIdx = Utils.findIndexInRange(fil, (v) => v.nesting <= fil[itemIdx].nesting, itemIdx + 1);
                        if (itemContentEndIdx < 0) {
                            itemContentEndIdx = fil.length;
                        }
                        return [[...fil.slice(0, itemIdx + 1),
                                ...createFolderItems(folderResults),
                                ...fil.slice(itemContentEndIdx)], false];
                    }))
                    .catch((e) => console.warn("Failed to retrieve folders content. ", e))

                    return [[...fil.slice(0, itemIdx),
                            {...fil[itemIdx], open: true},
                            ...fil.slice(itemIdx + 1)], false];
            }
        });
    }

    function handleItemClick(e: React.MouseEvent<Element, MouseEvent>, path: string, id: string) {
        if (e.button != 0) {
            return;
        }

        const itemIdx = fileItems.findIndex((v) => v.id == id);
        if (itemIdx < 0) {
            return;
        }

        let startIdx = itemIdx;
        let endIdx = itemIdx;

        let idsToUpdate = new Set<string>();
        let doSelect = false;
        const clearOthers = !e.ctrlKey;
        // Clear selected items and the item corresponding to path to selected
        if (e.shiftKey && lastSelectedElementRef.current) {
            const lastItemIdx = fileItems.findIndex((v) => v.id == lastSelectedElementRef.current);

            if (itemIdx < lastItemIdx) {
                endIdx = lastItemIdx;
            } else if (lastItemIdx > 0) {
                startIdx = lastItemIdx;
            }
        }

        if (e.ctrlKey) {
            doSelect = e.shiftKey || !fileItems[itemIdx].selected;

            if (doSelect) {
                lastSelectedElementRef.current = id;
            }
            fileItems.slice(startIdx, endIdx + 1).forEach((e) => idsToUpdate.add(e.id))
        } else {
            doSelect = true;
            lastSelectedElementRef.current = id;
            fileItems.slice(startIdx, endIdx + 1).forEach((e) => idsToUpdate.add(e.id));
        }

        updateItemList((fil) => [fil.map((e) => idsToUpdate.has(e.id)
                                                ? {...e, selected: doSelect}
                                                : {...e, selected: clearOthers? false : e.selected}),
                                 true]);
    }

    useEffect(() => {
        onSelectListUpdate(selectedList);
    }, [selectedList]);

    return (
        <ul className={className + " filetreeroot"}>
            {fileItems.map((e) =>
                <SelectableFileItem path={e.path} icon={<FolderItemIcon item={e} onClick={toggleItemOpen}/>}
                                    id={e.id}
                                    isSelected={e.selected}
                                    style={{paddingLeft: (e.nesting * 20) + "px"}}
                                    onClick={handleItemClick}
                                    key={e.id as React.Key}/>)}
        </ul>
    );
}

export default SelectableFileTree;
