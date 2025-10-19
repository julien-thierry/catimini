import * as path from 'path';
import { before, describe, test } from "mocha";
import { expect } from "expect-webdriverio";

import { expectArrayOfSize, setupTestFileTree } from "./common";

describe('Side Panel tests', () => {

before(() => {
    setupTestFileTree([
        "testDir1",
        "testDir2",
        "testDir3",
        path.join("testDir1", "subDir1"),
        path.join("testDir1", "subDir2"),
        path.join("testDir1", "subDir2", "subsubdir"),
        path.join("testDir2", "subDir", "subsubdir"),
    ]);
});

test('should be able to list folders from filesystem', async () => {
    const body = await $('body');

    const togglePanelButton = await body.$('button[aria-label="Toggle Folder Panel"]');
    await expect(togglePanelButton).toExist();
    await expect(togglePanelButton).toBeDisplayedInViewport();
    await togglePanelButton.click();

    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 1);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 4);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("testDir1");
        await expect(listedElements[2]).toHaveText("testDir2");
        await expect(listedElements[3]).toHaveText("testDir3");
    }
});

test('should be able to list subfolders from filesystem', async () => {
    const body = await $('body');

    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(4);
        await listedElements[1].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 6);
        await expect(listedElements).toBeElementsArrayOfSize(6);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("testDir1");
        await expect(listedElements[2]).toHaveText("subDir1");
        await expect(listedElements[3]).toHaveText("subDir2");
        await expect(listedElements[4]).toHaveText("testDir2");
        await expect(listedElements[5]).toHaveText("testDir3");
        await listedElements[3].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 7);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("testDir1");
        await expect(listedElements[2]).toHaveText("subDir1");
        await expect(listedElements[3]).toHaveText("subDir2");
        await expect(listedElements[4]).toHaveText("subsubdir");
        await expect(listedElements[5]).toHaveText("testDir2");
        await expect(listedElements[6]).toHaveText("testDir3");
        await listedElements[5].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 8);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("testDir1");
        await expect(listedElements[2]).toHaveText("subDir1");
        await expect(listedElements[3]).toHaveText("subDir2");
        await expect(listedElements[4]).toHaveText("subsubdir");
        await expect(listedElements[5]).toHaveText("testDir2");
        await expect(listedElements[6]).toHaveText("subDir");
        await expect(listedElements[7]).toHaveText("testDir3");
        await listedElements[6].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 9);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("testDir1");
        await expect(listedElements[2]).toHaveText("subDir1");
        await expect(listedElements[3]).toHaveText("subDir2");
        await expect(listedElements[4]).toHaveText("subsubdir");
        await expect(listedElements[5]).toHaveText("testDir2");
        await expect(listedElements[6]).toHaveText("subDir");
        await expect(listedElements[7]).toHaveText("subsubdir");
        await expect(listedElements[8]).toHaveText("testDir3");
    }
});

test('should be able to collapse folder list', async () => {
    const body = await $('body');

    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(9);
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await expectArrayOfSize(folderPanel, 'li', 1);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }
});

});
