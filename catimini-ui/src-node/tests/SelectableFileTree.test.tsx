import {act} from 'react';
import ReactDOMClient from 'react-dom/client';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mockIPC } from "@tauri-apps/api/mocks";
import userEvent, { UserEvent } from '@testing-library/user-event';

import Commands from '../commands';
import SelectableFileTree from '../SelectableFileTree';

describe("SelectableFileTree", () => {

let mockFileTree : Map<String, Commands.FolderContent>;
let user : UserEvent;
beforeEach(() => {mockFileTree = new Map(); user = userEvent.setup();});

mockIPC(async (cmd, args) => {
    if (cmd === "list_folder_files") {
        if (args && typeof args === typeof {path: String}) {
            const path = (args as {path: String}).path;
            if (mockFileTree.has(path)) {
                return mockFileTree.get(path);
            } else {
                return {folders: [], images: [], others: []} as Commands.FolderContent;
            }
        } else {
            const roots = [...mockFileTree.keys()].filter(
                (r) => ![...mockFileTree.values()].some((e) => e.folders.includes(r))
            );
            return {folders: roots, images: [], others: []} as Commands.FolderContent;
        }
    }
    return null;
});

async function clickFileTreeEntryIcon(entry: HTMLLIElement) {
    expect(entry.classList).toContain("filetreeitem");
    const icons = entry.querySelectorAll("svg");
    expect(icons).toHaveLength(1);
    await user.click(icons[0]);
}

test("should list single root folder", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root"]} onSelectListUpdate={() => {}}/>
        );
    });

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toMatch("root");
    expect(items[0].classList).not.toContain("selected");
});

test("should select single folder on click", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    const onSelect = vi.fn((_) => {});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root"]} onSelectListUpdate={onSelect}/>
        );
    });

    onSelect.mockClear();

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(1);
    expect(items[0].classList).not.toContain("selected");

    await user.click(items[0]);
    expect(items[0].classList).toContain("selected");

    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root", content: {folders: [], images: [], others: []}}]);
});

test("should list multiple root folder", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root1", "root2", "root3"]} onSelectListUpdate={() => {}}/>
        );
    });

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);

    expect(items[0].textContent).toMatch("root1");
    expect(items[0].classList).not.toContain("selected");

    expect(items[1].textContent).toMatch("root2");
    expect(items[1].classList).not.toContain("selected");

    expect(items[2].textContent).toMatch("root3");
    expect(items[2].classList).not.toContain("selected");
});

test("should switch selected folder on click", async () => {
        let container = document.createElement('div');
    document.body.appendChild(container);

    const onSelect = vi.fn((_) => {});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root1", "root2", "root3"]} onSelectListUpdate={onSelect}/>
        );
    });

    onSelect.mockClear();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);

    await user.click(items[0]);
    expect(items[0].classList).toContain("selected");
    expect(items[1].classList).not.toContain("selected");
    expect(items[2].classList).not.toContain("selected");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1", content: {folders: [], images: [], others: []}}]);

    onSelect.mockClear();
    await user.click(items[2]);
    expect(items[0].classList).not.toContain("selected");
    expect(items[1].classList).not.toContain("selected");
    expect(items[2].classList).toContain("selected");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root3", content: {folders: [], images: [], others: []}}]);

    onSelect.mockClear();
    await user.click(items[1]);
    expect(items[0].classList).not.toContain("selected");
    expect(items[1].classList).toContain("selected");
    expect(items[2].classList).not.toContain("selected");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root2", content: {folders: [], images: [], others: []}}]);

    onSelect.mockClear();
    await user.click(items[0]);
    expect(items[0].classList).toContain("selected");
    expect(items[1].classList).not.toContain("selected");
    expect(items[2].classList).not.toContain("selected");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1", content: {folders: [], images: [], others: []}}]);
});

test("should open/close folder on icon click", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    mockFileTree.set("root", {folders: ["root/f1", "root/f2", "root/f3"], images: ["img1.jpg"], others: ["other1.txt"]});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root"]} onSelectListUpdate={() => {}}/>
        );
    });

    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toMatch("root");
        expect(items[0].classList).not.toContain("selected");

        await clickFileTreeEntryIcon(items[0]);
    }

    // Check contained folders are displayed
    {
        const items = container.querySelectorAll("li");

        expect(items).toHaveLength(4);
        expect(items[0].textContent).toMatch("root");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("f2");
        expect(items[3].textContent).toMatch("f3");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[0]);
    }

    // Check contained folders are collapsed
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toMatch("root");
        expect(items[0].classList).not.toContain("selected");

        // Check it can be openned again
        await clickFileTreeEntryIcon(items[0]);
    }

    {
        const items = container.querySelectorAll("li");

        expect(items).toHaveLength(4);
        expect(items[0].textContent).toMatch("root");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("f2");
        expect(items[3].textContent).toMatch("f3");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));
    }
});

test("should open multiple folders", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    mockFileTree.set("root1", {folders: ["root1/f1", "root1/f2", "root1/f3"], images: ["img1.jpg"], others: ["other1.txt"]});
    mockFileTree.set("root1/f1", {folders: ["root1/f1/c1", "root1/f1/c2"], images: [], others: []});
    mockFileTree.set("root1/f3", {folders: ["root1/f3/d"], images: [], others: []});
    mockFileTree.set("root2", {folders: ["root2/f1", "root2/g"], images: [], others: []});
    mockFileTree.set("root2/f1", {folders: ["root2/f1/e"], images: [], others: []});

    const onSelect = vi.fn(() => {});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root1", "root2"]} onSelectListUpdate={onSelect}/>
        );
    });

    onSelect.mockClear();

    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(2);
        expect(items[0].classList).not.toContain("selected");
        expect(items[1].classList).not.toContain("selected");

        await clickFileTreeEntryIcon(items[0]);
    }

    // root1 should be openned
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(5);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("f2");
        expect(items[3].textContent).toMatch("f3");
        expect(items[4].textContent).toMatch("root2");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[4]);
    }

    // root2 should be openned
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(7);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("f2");
        expect(items[3].textContent).toMatch("f3");
        expect(items[4].textContent).toMatch("root2");
        expect(items[5].textContent).toMatch("f1");
        expect(items[6].textContent).toMatch("g");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[3]);
    }

    // root1/f3 should be openned
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(8);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("f2");
        expect(items[3].textContent).toMatch("f3");
        expect(items[4].textContent).toMatch("d");
        expect(items[5].textContent).toMatch("root2");
        expect(items[6].textContent).toMatch("f1");
        expect(items[7].textContent).toMatch("g");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[6]);
    }

    // root2/f1 should be openned
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(9);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("f2");
        expect(items[3].textContent).toMatch("f3");
        expect(items[4].textContent).toMatch("d");
        expect(items[5].textContent).toMatch("root2");
        expect(items[6].textContent).toMatch("f1");
        expect(items[7].textContent).toMatch("e");
        expect(items[8].textContent).toMatch("g");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[1]);
    }

    // root1/f1 should be openned
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(11);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("f1");
        expect(items[2].textContent).toMatch("c1");
        expect(items[3].textContent).toMatch("c2");
        expect(items[4].textContent).toMatch("f2");
        expect(items[5].textContent).toMatch("f3");
        expect(items[6].textContent).toMatch("d");
        expect(items[7].textContent).toMatch("root2");
        expect(items[8].textContent).toMatch("f1");
        expect(items[9].textContent).toMatch("e");
        expect(items[10].textContent).toMatch("g");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[0]);
    }

    // root1 should be closed
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(5);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("root2");
        expect(items[2].textContent).toMatch("f1");
        expect(items[3].textContent).toMatch("e");
        expect(items[4].textContent).toMatch("g");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[2]);
    }

    // root2/f1 should be closed
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(4);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("root2");
        expect(items[2].textContent).toMatch("f1");
        expect(items[3].textContent).toMatch("g");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));

        await clickFileTreeEntryIcon(items[1]);
    }

    // root2 should be closed
    {
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toMatch("root1");
        expect(items[1].textContent).toMatch("root2");
        items.forEach((it) => expect(it.classList).not.toContain("selected"));
    }

    expect(onSelect).not.toHaveBeenCalled();
});

test("should select inner folders", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    mockFileTree.set("root1", {folders: ["root1/f1", "root1/f2", "root1/f3"], images: ["img1.jpg"], others: ["other1.txt"]});
    mockFileTree.set("root1/f1", {folders: ["root1/f1/c1", "root1/f1/c2"], images: [], others: []});
    mockFileTree.set("root1/f3", {folders: ["root1/f3/d"], images: [], others: []});
    mockFileTree.set("root2", {folders: ["root2/f1", "root2/g"], images: [], others: []});
    mockFileTree.set("root2/f1", {folders: ["root2/f1/e"], images: [], others: []});

    const onSelect = vi.fn(() => {});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root1", "root2"]} onSelectListUpdate={onSelect}/>
        );
    });

    onSelect.mockClear();

    // Open root1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[0]);
    // Open root2
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[4]);
    // Open root2/f1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[5]);
    // Open root1/f1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[1]);

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toMatch("root1");
    expect(items[1].textContent).toMatch("f1");
    expect(items[2].textContent).toMatch("c1");
    expect(items[3].textContent).toMatch("c2");
    expect(items[4].textContent).toMatch("f2");
    expect(items[5].textContent).toMatch("f3");
    expect(items[6].textContent).toMatch("root2");
    expect(items[7].textContent).toMatch("f1");
    expect(items[8].textContent).toMatch("e");
    expect(items[9].textContent).toMatch("g");
    items.forEach((it) => expect(it.classList).not.toContain("selected"));
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(items[2]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1/f1/c1", content: {folders: [], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 2 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    await user.click(items[4]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1/f2", content: {folders: [], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 4 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    await user.click(items[6]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root2", content: {folders: ["root2/f1", "root2/g"], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 6 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    await user.click(items[9]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root2/g", content: {folders: [], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 9 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    await user.click(items[1]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1/f1", content: {folders: ["root1/f1/c1", "root1/f1/c2"], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 1 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();
});

test("should select multiple folders with control key", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    mockFileTree.set("root1", {folders: ["root1/f1", "root1/f2", "root1/f3"], images: ["img1.jpg"], others: ["other1.txt"]});
    mockFileTree.set("root1/f1", {folders: ["root1/f1/c1", "root1/f1/c2"], images: [], others: []});
    mockFileTree.set("root1/f3", {folders: ["root1/f3/d"], images: [], others: []});
    mockFileTree.set("root2", {folders: ["root2/f1", "root2/g"], images: [], others: []});
    mockFileTree.set("root2/f1", {folders: ["root2/f1/e"], images: [], others: []});

    const onSelect = vi.fn(() => {});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root1", "root2"]} onSelectListUpdate={onSelect}/>
        );
    });

    onSelect.mockClear();

    // Open root1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[0]);
    // Open root2
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[4]);
    // Open root2/f1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[5]);
    // Open root1/f1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[1]);

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toMatch("root1");
    expect(items[1].textContent).toMatch("f1");
    expect(items[2].textContent).toMatch("c1");
    expect(items[3].textContent).toMatch("c2");
    expect(items[4].textContent).toMatch("f2");
    expect(items[5].textContent).toMatch("f3");
    expect(items[6].textContent).toMatch("root2");
    expect(items[7].textContent).toMatch("f1");
    expect(items[8].textContent).toMatch("e");
    expect(items[9].textContent).toMatch("g");
    items.forEach((it) => expect(it.classList).not.toContain("selected"));
    expect(onSelect).not.toHaveBeenCalled();

    // Select root1/f1/c2
    await user.click(items[3]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1/f1/c2", content: {folders: [], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 3 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));

    await user.keyboard("{Control>}");

    // Select root1/f2
    await user.click(items[4]);
    expect(onSelect).toHaveBeenNthCalledWith(2, [
        {path: "root1/f1/c2", content: {folders: [], images: [], others: []}},
        {path: "root1/f2", content: {folders: [], images: [], others: []}}
    ]);
    items.forEach((e, idx) => [3, 4].includes(idx) ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));

    // Select root2/f1
    await user.click(items[7]);
    expect(onSelect).toHaveBeenNthCalledWith(3, [
        {path: "root1/f1/c2", content: {folders: [], images: [], others: []}},
        {path: "root1/f2", content: {folders: [], images: [], others: []}},
        {path: "root2/f1", content: {folders: ["root2/f1/e"], images: [], others: []}},
    ]);
    items.forEach((e, idx) => [3, 4, 7].includes(idx) ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));

    // Select root1
    await user.click(items[0]);
    expect(onSelect).toHaveBeenNthCalledWith(4, [
        {path: "root1", content: {folders: ["root1/f1", "root1/f2", "root1/f3"], images: ["img1.jpg"], others: ["other1.txt"]}},
        {path: "root1/f1/c2", content: {folders: [], images: [], others: []}},
        {path: "root1/f2", content: {folders: [], images: [], others: []}},
        {path: "root2/f1", content: {folders: ["root2/f1/e"], images: [], others: []}},
    ]);
    items.forEach((e, idx) => [0, 3, 4, 7].includes(idx) ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));

    // Unselect root1/f2
    await user.click(items[4]);
    expect(onSelect).toHaveBeenNthCalledWith(5, [
        {path: "root1", content: {folders: ["root1/f1", "root1/f2", "root1/f3"], images: ["img1.jpg"], others: ["other1.txt"]}},
        {path: "root1/f1/c2", content: {folders: [], images: [], others: []}},
        {path: "root2/f1", content: {folders: ["root2/f1/e"], images: [], others: []}},
    ]);
    items.forEach((e, idx) => [0, 3, 7].includes(idx) ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));

    // Stop selecting
    await user.keyboard("{/Control>}");
    await user.click(items[6]);
    expect(onSelect).toHaveBeenNthCalledWith(6, [
        {path: "root2", content: {folders: ["root2/f1", "root2/g"], images: [], others: []}},
    ]);
    items.forEach((e, idx) => idx == 6 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
});

test("should select groups of folders with shift key", async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    mockFileTree.set("root1", {folders: ["root1/f1", "root1/f2", "root1/f3"], images: ["img1.jpg"], others: ["other1.txt"]});
    mockFileTree.set("root1/f1", {folders: ["root1/f1/c1", "root1/f1/c2"], images: [], others: []});
    mockFileTree.set("root1/f3", {folders: ["root1/f3/d"], images: [], others: []});
    mockFileTree.set("root2", {folders: ["root2/f1", "root2/g"], images: [], others: []});
    mockFileTree.set("root2/f1", {folders: ["root2/f1/e"], images: [], others: []});

    const onSelect = vi.fn(() => {});

    await act(async () => {
        ReactDOMClient.createRoot(container).render(
            <SelectableFileTree rootPaths={["root1", "root2"]} onSelectListUpdate={onSelect}/>
        );
    });

    onSelect.mockClear();

    // Open root1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[0]);
    // Open root2
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[4]);
    // Open root2/f1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[5]);
    // Open root1/f1
    await clickFileTreeEntryIcon(container.querySelectorAll("li")[1]);

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toMatch("root1");
    expect(items[1].textContent).toMatch("f1");
    expect(items[2].textContent).toMatch("c1");
    expect(items[3].textContent).toMatch("c2");
    expect(items[4].textContent).toMatch("f2");
    expect(items[5].textContent).toMatch("f3");
    expect(items[6].textContent).toMatch("root2");
    expect(items[7].textContent).toMatch("f1");
    expect(items[8].textContent).toMatch("e");
    expect(items[9].textContent).toMatch("g");
    items.forEach((it) => expect(it.classList).not.toContain("selected"));
    expect(onSelect).not.toHaveBeenCalled();

    // Select root1/f1/c2
    await user.click(items[3]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([{path: "root1/f1/c2", content: {folders: [], images: [], others: []}}]);
    items.forEach((e, idx) => idx == 3 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    await user.keyboard("{Shift>}");

    // click root2/f1
    await user.click(items[7]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([
        {path: "root1/f1/c2", content: {folders: [], images: [], others: []}},
        {path: "root1/f2", content: {folders: [], images: [], others: []}},
        {path: "root1/f3", content: {folders: ["root1/f3/d"], images: [], others: []}},
        {path: "root2", content: {folders: ["root2/f1", "root2/g"], images: [], others: []}},
        {path: "root2/f1", content: {folders: ["root2/f1/e"], images: [], others: []}},
    ]);
    items.forEach((e, idx) => idx >= 3 && idx <= 7 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    // click root2/g
    await user.click(items[9]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([
        {path: "root2/f1", content: {folders: ["root2/f1/e"], images: [], others: []}},
        {path: "root2/f1/e", content: {folders: [], images: [], others: []}},
        {path: "root2/g", content: {folders: [], images: [], others: []}},
    ]);
    items.forEach((e, idx) => idx >= 7 && idx <= 9 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    // click root1/f2
    await user.click(items[4]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([
        {path: "root1/f2", content: {folders: [], images: [], others: []}},
        {path: "root1/f3", content: {folders: ["root1/f3/d"], images: [], others: []}},
        {path: "root2", content: {folders: ["root2/f1", "root2/g"], images: [], others: []}},
        {path: "root2/f1", content: {folders: ["root2/f1/e"], images: [], others: []}},
        {path: "root2/f1/e", content: {folders: [], images: [], others: []}},
        {path: "root2/g", content: {folders: [], images: [], others: []}},
    ]);
    items.forEach((e, idx) => idx >= 4 && idx <= 9 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
    onSelect.mockClear();

    // Close root2
    await clickFileTreeEntryIcon(items[6]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([
        {path: "root1/f2", content: {folders: [], images: [], others: []}},
        {path: "root1/f3", content: {folders: ["root1/f3/d"], images: [], others: []}},
        {path: "root2", content: {folders: ["root2/f1", "root2/g"], images: [], others: []}},
    ]);
    onSelect.mockClear();

    await user.keyboard("{/Shift>}");

    const new_items = container.querySelectorAll("li");
    expect(new_items).toHaveLength(7);
    expect(new_items[0].textContent).toMatch("root1");
    expect(new_items[1].textContent).toMatch("f1");
    expect(new_items[2].textContent).toMatch("c1");
    expect(new_items[3].textContent).toMatch("c2");
    expect(new_items[4].textContent).toMatch("f2");
    expect(new_items[5].textContent).toMatch("f3");
    expect(new_items[6].textContent).toMatch("root2");
    new_items.forEach((e, idx) => idx >= 4 && idx <= 6 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));

    await user.click(new_items[5]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([
        {path: "root1/f3", content: {folders: ["root1/f3/d"], images: [], others: []}},
    ]);
    new_items.forEach((e, idx) => idx == 5 ? expect(e.classList).toContain("selected") : expect(e.classList).not.toContain("selected"));
});
});
