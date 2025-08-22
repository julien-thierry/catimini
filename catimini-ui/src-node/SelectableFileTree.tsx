import { useEffect, useState, useRef } from "react";
import { FaFolder, FaFolderMinus, FaFolderPlus } from "react-icons/fa";

import "./SelectableFileTree.css"

import Commands from "./commands";
import Utils from "./utils";

function SelectableFileItem({path, id, icon, isSelected, onClick, style} :
                            {
                                path: String,
                                id: String,
                                icon: React.ReactElement,
                                isSelected: boolean,
                                onClick: (e: React.MouseEvent<Element, MouseEvent>, path: String, id: String) => void,
                                style? : React.CSSProperties,
                            }
                            ) {

    function handleItemClick(e) {
        onClick(e, path, id);
    }

    // node:path.basename is not always available on the client side
    function fileBasename(path) {
        return decodeURI(new URL(`file:///${path}`).toString()).split('/').pop()
    }

    return (
        <li className={"filetreeitem" + (isSelected ? " selected" : "")} style={style} onClick={handleItemClick}>
            {icon} {fileBasename(path)}
        </li>
    );
}

type FileItem = {
    path: String,
    content: Commands.FolderContent,
    open: boolean,
    selected: boolean,
    nesting: number
}

function newFolderItem(path: String, content: Commands.FolderContent, parent?: FileItem) : FileItem {
    return {
        path,
        content: content,
        open: false,
        selected: false,
        nesting: parent ? parent.nesting + 1 : 0
    };
}

function FolderItemIcon({item, id, onClick} :
                      {
                        item: FileItem,
                        id: String,
                        onClick?: (e: React.MouseEvent<Element, MouseEvent>, p: String, id: String) => void
                      }) {
    function handleIconClick(e) {
        if (onClick) {
            e.stopPropagation();
            onClick(e, item.path, id);
        }
    }

    if (item.content.folders.length > 0) {
        return item.open ? <FaFolderMinus onClick={handleIconClick} size={14}/> : <FaFolderPlus onClick={handleIconClick} size={14}/>
    }
    return <FaFolder size={14}/>;
}

function SelectableFileTree({rootPaths, onSelectListUpdate, className, style} :
                            {
                                rootPaths : Array<String>,
                                onSelectListUpdate : (folderInfo: Array<Utils.FolderInfo>) => void,
                                className? : string,
                                style? : React.CSSProperties,
                            }) {
    const [fileItems, setFileItems] = useState<Array<{id: String, item: FileItem}>>([]);
    const [lastRootPaths, setLastRootPaths] = useState<Array<String>>([]);

    function requestFolderItems(paths : Array<String>, parent? : FileItem) : Promise<Array<PromiseSettledResult<FileItem>>> {
        return Promise.allSettled(paths.map(async (e) => newFolderItem(e, await Commands.getFolderContent(e), parent)));
    }

    function createFolderItems(folderResults: Array<PromiseSettledResult<FileItem>>) :  Array<{id: String, item: FileItem}> {
        return folderResults.flatMap((result) => {
            if (result.status == "fulfilled") {
                return [{id: crypto.randomUUID(), item: result.value}]
            } else {
                console.warn(result.reason); return []
            }
        });
    }

    const [selectedList, setSelectedList] = useState<Array<Utils.FolderInfo>>([]);
    function updateItemList(newItemsList: Array<{id: String, item: FileItem}>, updateSelected: boolean) {
        setFileItems(newItemsList)
        if (updateSelected) {
            setSelectedList(newItemsList.filter((e) => e.item.selected)
                                        .map((e) => {return {path: e.item.path, content: e.item.content}}))
        }
    }

    if (rootPaths != lastRootPaths) {
        setLastRootPaths(rootPaths);
        requestFolderItems(rootPaths)
            .then((folderResults) => updateItemList(createFolderItems(folderResults), true))
            .catch((e) => { console.warn("Failed to retrieve folders' contents. ", e); setFileItems([]) });
    }

    function toggleItemOpen(e: React.MouseEvent<Element, MouseEvent>, path : String, id : String) {
         if (e.button != 0) {
            return;
        }

        const itemIdx = fileItems.findIndex((v) => v.id == id);
        if (itemIdx < 0) {
            return;
        }

        if (fileItems[itemIdx].item.open) {
            // Close the file, remove all its childen fileitems from the list
            let nextIdx = fileItems.slice(itemIdx + 1).findIndex((v) => v.item.nesting <= fileItems[itemIdx].item.nesting);
            if (nextIdx < 0) {
                nextIdx = fileItems.length;
            } else {
                nextIdx += itemIdx + 1;
            }

            const updateSelected : boolean = fileItems.slice(itemIdx + 1, nextIdx).some((e) => e.item.selected);

            updateItemList([...fileItems.slice(0, itemIdx), {...fileItems[itemIdx], item: {...fileItems[itemIdx].item, open: false}}, ...fileItems.slice(nextIdx)],
                           updateSelected);
        } else {
            // Open the file, create children file items and insert them right after the folder being opened
            requestFolderItems(fileItems[itemIdx].item.content.folders, fileItems[itemIdx].item)
                .then((folderResults) => updateItemList([...fileItems.slice(0, itemIdx),
                                                        {...fileItems[itemIdx], item: {...fileItems[itemIdx].item, open: true}},
                                                        ...createFolderItems(folderResults),
                                                        ...fileItems.slice(itemIdx + 1)],
                                                       false))
                .catch((e) => console.warn("Failed to retrieve folders content. ", e))
        }
    }

    const lastSelectedElementRef = useRef<String | null>(null);
    function handleItemClick(e, path, id) {
        if (e.button != 0) {
            return;
        }

        const itemIdx = fileItems.findIndex((v) => v.id == id);
        if (itemIdx < 0) {
            return;
        }

        let startIdx = itemIdx;
        let endIdx = itemIdx;
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
            const doSelect = e.shiftKey || !fileItems[startIdx].item.selected;

            if (doSelect) {
                lastSelectedElementRef.current = id;
            } else if (selectedList.length <= 1) {
                // Clearing the last element from the selected list
                lastSelectedElementRef.current = null;
            }

            updateItemList([...fileItems.slice(0, startIdx),
                            ...fileItems.slice(startIdx, endIdx + 1).map((e) => { return {...e, item: {...e.item, selected: doSelect}} }),
                            ...fileItems.slice(endIdx + 1)],
                           true);
        } else {
            updateItemList([...fileItems.map((e, idx) => { return {...e, item: {...e.item, selected: idx >= startIdx && idx <= endIdx}} })], true);
            lastSelectedElementRef.current = id;
        }
    }

    useEffect(() => {
        onSelectListUpdate(selectedList);
    }, [selectedList]);

    return (
         <ul className={className + " filetreeroot"}>
            {fileItems.map((e) =>
                <SelectableFileItem path={e.item.path} icon={<FolderItemIcon item={e.item} id={e.id} onClick={toggleItemOpen}/>}
                                    id={e.id}
                                    isSelected={e.item.selected}
                                    style={{paddingLeft: (e.item.nesting * 20) + "px"}}
                                    onClick={handleItemClick}
                                    key={e.id as React.Key}/>)}
        </ul>
    );
}

export default SelectableFileTree;
