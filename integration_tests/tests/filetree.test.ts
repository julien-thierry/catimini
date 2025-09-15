import * as path from 'path';
import { before, describe, test } from "mocha";
import { expect } from "expect-webdriverio";

import { setupTestFileTree } from "./common";

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
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(1);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(2);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await listedElements[1].$('[data-testid="clickable-icon"]').click();
    }

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(5);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await expect(listedElements[2]).toHaveText("testDir1");
        await expect(listedElements[3]).toHaveText("testDir2");
        await expect(listedElements[4]).toHaveText("testDir3");
    }
});

test('should be able to list subfolders from filesystem', async () => {
    const body = await $('body');

    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(5);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(5);
        await listedElements[2].$('[data-testid="clickable-icon"]').click();
    }

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(7);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await expect(listedElements[2]).toHaveText("testDir1");
        await expect(listedElements[3]).toHaveText("subDir1");
        await expect(listedElements[4]).toHaveText("subDir2");
        await expect(listedElements[5]).toHaveText("testDir2");
        await expect(listedElements[6]).toHaveText("testDir3");
        await listedElements[4].$('[data-testid="clickable-icon"]').click();
    }

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(8);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await expect(listedElements[2]).toHaveText("testDir1");
        await expect(listedElements[3]).toHaveText("subDir1");
        await expect(listedElements[4]).toHaveText("subDir2");
        await expect(listedElements[5]).toHaveText("subsubdir");
        await expect(listedElements[6]).toHaveText("testDir2");
        await expect(listedElements[7]).toHaveText("testDir3");
        await listedElements[6].$('[data-testid="clickable-icon"]').click();
    }

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(9);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await expect(listedElements[2]).toHaveText("testDir1");
        await expect(listedElements[3]).toHaveText("subDir1");
        await expect(listedElements[4]).toHaveText("subDir2");
        await expect(listedElements[5]).toHaveText("subsubdir");
        await expect(listedElements[6]).toHaveText("testDir2");
        await expect(listedElements[7]).toHaveText("subDir");
        await expect(listedElements[8]).toHaveText("testDir3");
        await listedElements[7].$('[data-testid="clickable-icon"]').click();
    }

    {
        await expect(await folderPanel.$$('li')).toBeElementsArrayOfSize(10);
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await expect(listedElements[2]).toHaveText("testDir1");
        await expect(listedElements[3]).toHaveText("subDir1");
        await expect(listedElements[4]).toHaveText("subDir2");
        await expect(listedElements[5]).toHaveText("subsubdir");
        await expect(listedElements[6]).toHaveText("testDir2");
        await expect(listedElements[7]).toHaveText("subDir");
        await expect(listedElements[8]).toHaveText("subsubdir");
        await expect(listedElements[9]).toHaveText("testDir3");
    }
});

test('should be able to collapse folder list', async () => {
    const body = await $('body');

    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(10);
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(1);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }
});

});
