const puppeteer = require('puppeteer-core');

let youtubeSearch = async (SongToSearch) =>{
    const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
});
    
    const page = await browser.newPage();
    await page.setViewport({
        width:1520,
        height:1080
    })
    
    const url = "https://www.youtube.com/watch?v="+SongToSearch;
    
    await page.goto(url);
    await page.waitForSelector('a[class="yt-simple-endpoint style-scope ytd-compact-video-renderer')
    const SongInfo = await page.$eval('a[class="yt-simple-endpoint style-scope ytd-compact-video-renderer',
(songInfo) => {
        
        return {   
            id: songInfo.href,
            title: songInfo.innerText
        }
    });       
    SongInfo.title=SongInfo.title.split('\n')[0];
    SongInfo.id = SongInfo.id.slice(32,SongInfo.id.length);
    
    await browser.close();
    return SongInfo

}
// youtubeSearch("vEmBUhnBtFI");
module.exports = {youtubeSearch};


