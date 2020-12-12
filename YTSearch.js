const puppeteer = require('puppeteer');

let youtubeSearch = async (SongToSearch) =>{
    const browser = await puppeteer.launch({headless: false,executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    args: [
        '--user-data-dir=%userprofile%\\AppData\\Local\\Chrome\\User Data',
        '--profile-directory=Profile 8'
    ]});
    
    const page = await browser.newPage();
    await page.setViewport({
        width:1520,
        height:1080
    })
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //     if(['image','media','stylesheet','font'].includes(req.resourceType())){
    //         req.abort();
    //     }
    //     else{
    //         req.continue();
    //     }
    // })
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


// const Crawler = require('crawler');

// let c = new Crawler({
//     // jQuery:false,
//     callback: function (err,res,done){
//         if(err){
//             console.log(err);
//         }
//         else{
            
//             console.log(res.body.length);
//         }
//         done();
//     }
// })

// c.queue('https://www.youtube.com/results?search_query=Scam+1992+bgm');