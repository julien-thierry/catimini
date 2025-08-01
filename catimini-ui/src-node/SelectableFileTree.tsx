import { useEffect, useState } from "react";
import { FaFolder, FaFolderMinus, FaFolderPlus } from "react-icons/fa";

import "./SelectableFileTree.css"

import Commands from "./commands";
import Utils from "./utils";

function SelectableFileItem({path, icon, isSelected, onClick, style} :
                            {
                                path: String,
                                icon: React.ReactElement,
                                isSelected: boolean,
                                onClick: (e: React.MouseEvent<Element, MouseEvent>, path: String) => void,
                                style? : React.CSSProperties,
                            }
                            ) {

    function handleItemClick(e) {
        onClick(e, path);
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

function FolderItemIcon({item, onClick} :
                      {
                        item: FileItem,
                        onClick?: (e: React.MouseEvent<Element, MouseEvent>, p: String) => void
                      }) {
    function handleIconClick(e) {
        if (onClick) {
            e.stopPropagation();
            onClick(e, item.path);
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
    const [fileItems, setFileItems] = useState<Array<FileItem>>([]);
    const [lastRootPaths, setLastRootPaths] = useState<Array<String>>([]);
    const [pendingUpdate, setPendingUpdate] = useState(false);

    async function createFolderItem(paths : String, content: Promise<Commands.FolderContent>, parent? : FileItem) : Promise<FileItem> {
        return newFolderItem(paths, await content, parent);
    }

    function createFolderItems(paths : Array<String>, parent? : FileItem) : Promise<Array<FileItem>> {
        return Promise.all(paths.map((e) => createFolderItem(e, Commands.getFolderContent(e), parent)));
    }

    if (rootPaths != lastRootPaths) {
        setLastRootPaths(rootPaths);
        createFolderItems(rootPaths)
            .then((newFileItems) => setFileItems(newFileItems))
            .catch((e) => { console.warn("Failed to retrieve folders' contents. ", e); setFileItems([]) });

        setPendingUpdate(false);
    }

    function toggleItemOpen(e: React.MouseEvent<Element, MouseEvent>, path : String) {
        const itemIdx = fileItems.findIndex((v) => v.path == path);
        if (itemIdx < 0) {
            return;
        }

        if (fileItems[itemIdx].open) {
            // Close the file, remove all its childen fileitems from the list
            let nextIdx = fileItems.slice(itemIdx + 1).findIndex((v) => v.nesting <= fileItems[itemIdx].nesting);
            if (nextIdx < 0) {
                nextIdx = fileItems.length;
            } else {
                nextIdx += itemIdx + 1;
            }

            const needUpdate = fileItems.slice(itemIdx + 1, nextIdx).some(e => e.selected);

            setFileItems([...fileItems.slice(0, itemIdx), {...fileItems[itemIdx], open: false}, ...fileItems.slice(nextIdx)]);
            // If we deleted some selected items, notify user
            setPendingUpdate(needUpdate);
        } else {
            // Open the file, create children file items and insert them right after the folder being opened
            createFolderItems(fileItems[itemIdx].content.folders, fileItems[itemIdx])
                .then((newFileItems) => setFileItems([...fileItems.slice(0, itemIdx),
                                                      {...fileItems[itemIdx], open: true},
                                                      ...newFileItems,
                                                      ...fileItems.slice(itemIdx + 1)]))
                .catch((e) => console.warn("Failed to retrieve folders content. ", e))
        }
    }

    function handleItemClick(e, path) {
        if (e.button != 0) {
            return;
        }

        const itemIdx = fileItems.findIndex((v) => v.path == path);
        if (itemIdx < 0) {
            return;
        }

        // Clear selected items and the item corresponding to path to selected
        const needUpdate = !fileItems[itemIdx].selected;
        setFileItems([
                      ...fileItems.slice(0, itemIdx).map((e) => { return {...e, selected: false}}),
                      {...fileItems[itemIdx], selected: true},
                      ...fileItems.slice(itemIdx + 1).map((e) => { return {...e, selected: false}})
                    ]);
        setPendingUpdate(needUpdate);
    }

    useEffect(() => {
        if (pendingUpdate) {
            setPendingUpdate(false);
            onSelectListUpdate(fileItems.filter((e) => e.selected)
                                        .flatMap((e) => e.content? {path: e.path, content: e.content} : []));
        }
    }, [fileItems, pendingUpdate])

    return (
         <ul className={className + " filetreeroot"}>
            {fileItems.map((e) =>
                <SelectableFileItem path={e.path} icon={<FolderItemIcon item={e} onClick={toggleItemOpen}/>}
                                    isSelected={e.selected}
                                    style={{paddingLeft: (e.nesting * 20) + "px"}}
                                    onClick={handleItemClick}
                                    key={self.crypto.randomUUID()}/>)}
        </ul>
    );
}

export default SelectableFileTree;
