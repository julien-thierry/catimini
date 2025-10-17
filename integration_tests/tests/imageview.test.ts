import * as path from 'path';
import { before, describe, test } from "mocha";
import { expect } from "expect-webdriverio";

import { expectTitle, setupTestFileTree } from "./common";

describe('Image View tests', () => {

before(() => {
    setupTestFileTree(["empty_dir"], [
        "test1.png",
        "test2.png",
        "test3.png",
        path.join("subdir", "test.png"),
    ]);
});

test('should set title when viewing an image', async () => {
    const body = await $('body');

    const togglePanelButton = await body.$('button[aria-label="Toggle Folder Panel"]');
    await expect(togglePanelButton).toExist();
    await expect(togglePanelButton).toBeDisplayedInViewport();
    await togglePanelButton.click();
    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(1);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await listedElements[0].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(2);
        await expect(listedElements[0]).toHaveText(expect.stringMatching("catimini-test-.*"));
        await expect(listedElements[1]).toHaveText("workdir");
        await expect(await listedElements[1].$('div[data-testid="filename"]')).toBeDisplayedInViewport();
        await listedElements[1].$('div[data-testid="filename"]').click();
    }

    await expect(await $('img[alt="viewerimage"]')).toExist();
    await expectTitle("test1.png");
});

test('should update title when switching images', async () => {
    const body = await $('body');

    const prevButton = await body.$('button[aria-label="Image Viewer Previous"]');
    await expect(prevButton).toExist();

    const nextButton = await body.$('button[aria-label="Image Viewer Next"]');
    await expect(nextButton).toExist();

    await prevButton.click();
    await expect(await browser.getTitle()).toBe("test1.png");
    await nextButton.click();
    await expectTitle("test2.png");
    await prevButton.click();
    await expectTitle("test1.png");
    await nextButton.click();
    await nextButton.click();
    await expectTitle("test3.png");
    await nextButton.click();
    await expectTitle("test3.png");
});

test('should update title when switching folder', async () => {
    const body = await $('body');
    const folderPanel = await body.$('[aria-label="Folder Panel"]');

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(2);
        await expect(listedElements[1]).toHaveText(expect.stringMatching("workdir"));
        await listedElements[1].$('[data-testid="clickable-icon"]').click();
    }

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(4);
        await expect(listedElements[3]).toHaveText(expect.stringMatching("subdir"));
        await listedElements[3].$('div[data-testid="filename"]').click();
        await expectTitle("test.png");
        await listedElements[1].$('div[data-testid="filename"]').click();
        await expectTitle("test1.png");
    }
});

test('should use default title when switching to empty folder', async () => {
    const body = await $('body');
    const folderPanel = await body.$('[aria-label="Folder Panel"]');

    {
        const listedElements = await folderPanel.$$('li');
        await expect(listedElements).toBeElementsArrayOfSize(4);
        await expect(listedElements[2]).toHaveText(expect.stringMatching("empty_dir"));
        await listedElements[2].$('div[data-testid="filename"]').click();
        await expectTitle("catimini");
        await expect(listedElements[1]).toHaveText(expect.stringMatching("workdir"));
        await listedElements[1].$('div[data-testid="filename"]').click();
        await expectTitle("test1.png");
    }
});

});
