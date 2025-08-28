import { describe, test } from "mocha";
import { expect } from "expect-webdriverio";

describe('Main View tests', () => {

test('should display image viewer', async () => {
    const body = await $('body');

    const prevButton = await body.$('button[aria-label="Image Viewer Previous"]');
    await expect(prevButton).toExist();
    await expect(prevButton).toBeDisplayedInViewport();

    const nextButton = await body.$('button[aria-label="Image Viewer Next"]');
    await expect(nextButton).toExist();
    await expect(nextButton).toBeDisplayedInViewport();

    const missingImgText = await prevButton.nextElement();
    await expect(missingImgText).toExist();
    await expect(missingImgText).toBeDisplayedInViewport();
    await expect(missingImgText).toBeDisplayedInViewport();
    await expect(missingImgText).toHaveText("No Images Found");
});

test('should be able to open/close folder panel', async () => {
    const body = await $('body');

    const togglePanelButton = await body.$('button[aria-label="Toggle Folder Panel"]');
    await expect(togglePanelButton).toExist();
    await expect(togglePanelButton).toBeDisplayedInViewport();
    await togglePanelButton.click();

    const folderPanel = await body.$('[aria-label="Folder Panel"]');
    await expect(folderPanel).toExist();
    await expect(folderPanel).toBeDisplayedInViewport();

    await togglePanelButton.click();
    await expect(folderPanel).not.toBeDisplayedInViewport();

    await togglePanelButton.click();
    await expect(folderPanel).toBeDisplayedInViewport();

    const resizeBar = await folderPanel.$('[aria-label="Width Resize Bar"]');
    await expect(resizeBar).toExist();
    await expect(resizeBar).toBeDisplayedInViewport();

    const absentBar = await folderPanel.$('[aria-label="Height Resize Bar"]');
    await expect(absentBar).not.toExist();
});

});