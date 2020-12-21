const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const youtube = require('youtube-sr');
// const musicaddon = require('discord-dynamic-music-bot-addon');
const dotenv = require('dotenv').config();
const youtuberecommend = require('./YTSearch.js');

const commands = process.env.Commands.split(',');
let Songqueue = new Map();

// const Youtube_addon = new musicaddon(process.env.Youtube_Api_key);
const client = new Discord.Client({
    partials:["MESSAGE","USER"]
})
client.login(process.env.Token);

client.on('ready', () => {
    console.log("Bot is ready");
    Songqueue.clear();
})

client.on('message',async (msg) => {
    if(msg.author.bot){
        return;
    }
    
    if(msg.content.startsWith(process.env.BOT_Prefix)){
        const args = msg.content.split(" ");

        if(args[1]==commands[7] && args.length == 2){
            msg.channel.send("# play - To play your next desired song \n# playnow - To play your desired song right now \n# skip - To skip currently playing song \n# stop - To stop playing songs \n# recommend - To play a recommended song for you");

            return;
        }
        
        if(args.length==1 || commands.indexOf(args[1]) == -1 || ((args[1]==commands[0] || args[1]==commands[1]) && args.length==2)){
            msg.channel.send("Please Provide a proper command");
            return;
        }
        let serverqueue=Songqueue.get(msg.guild.id);
        
        var VoiceChannelConnection = null;
        var proms = [];
        
        
        if(args[1]==commands[0] || args[1]==commands[1]){
            const songsearch = args.slice(2,args.length).join(" ");
            
            proms.push(HandlingVoiceChannel(msg));
            proms.push(youtube.search(songsearch,{limit: 1}));
            Promise.allSettled(proms).then(async (datas)=>{
                
                var data = datas[0].value;
                var songinfo = datas[1].value;
                VoiceChannelConnection = data;
                
                if(VoiceChannelConnection[0]){
                    
                
                    
                    if(serverqueue && VoiceChannelConnection[1] != null){
                        if(serverqueue[0] !== VoiceChannelConnection[1]){
                            serverqueue[0]=VoiceChannelConnection[1];
                        }
                    }

                    songinfo = {
                        id : songinfo[0].id,
                        title: songinfo[0].title
                    };

                    // VoiceChannelConnection[1].on('disconnect', async () => {
                    //     console.log("Disconnected");
                    //     await Songqueue.delete(msg.guild.id);
                    //     serverqueue = null;
                    //     return;
                    // })
                    
                    if(serverqueue){
                        Recommendation(msg,songinfo);
                        if(args[1]==commands[0]){
                            serverqueue[1].push(songinfo);
                            msg.channel.send(songinfo.title + " Added to the queue");
                        }
                        else{
                            serverqueue[1][0] = songinfo;
                            playMusic(msg,serverqueue[1][0]);
                        }
                    }
                    else{
                        // console.log(VoiceChannelConnection[1]);
                        
                        Songqueue.set(msg.guild.id,[VoiceChannelConnection[1],[songinfo],null,new Map()]);
                        serverqueue = Songqueue.get(msg.guild.id);
                        playMusic(msg,serverqueue[1][0]);
                        Recommendation(msg,serverqueue[1][0]);
                    }
                }
                else{
                    
                    if(!serverqueue && msg.guild.voice && msg.guild.voice.channel){
                        await msg.guild.voice.channel.leave();
                        Songqueue.delete(msg.guild.id);
                    }
                }
            }).catch(async (err) => {
                
                msg.channel.send("Unable to play the song you requested");
                if(!serverqueue && msg.guild.voice && msg.guild.voice.channel){
                    await msg.guild.voice.channel.leave();
                    Songqueue.delete(msg.guild.id);
                }
            });
            
        }
        else{
            if(!serverqueue){
                msg.channel.send("Nothing to "+args[1]);
                return;
            }
            try{
                VoiceChannelConnection = await HandlingVoiceChannel(msg);
            }catch(err){
                msg.channel.send("Some error occured");
                if(!serverqueue && msg.guild.voice && msg.guild.voice.channel){
                    await msg.guild.voice.channel.leave();
                    Songqueue.delete(msg.guild.id);
                }
                return;
            }
                
            if(!VoiceChannelConnection[0]){
                if(!serverqueue && msg.guild.voice && msg.guild.voice.channel){
                    await msg.guild.voice.channel.leave();
                    Songqueue.delete(msg.guild.id);
                }
                return;
            }   
            
            if(serverqueue && VoiceChannelConnection[1] != null){
                if(serverqueue[0] !== VoiceChannelConnection[1]){
                    serverqueue[0]=VoiceChannelConnection[1];
                }
            }
            if(args[1]==commands[2] || args[1]==commands[3]){
                

                PauseMusic(serverqueue[2],args[1],msg);
            }
            if(args[1]==commands[5]){
                msg.channel.send("Skipped");
                SkipMusic(msg);
            }
            if(args[1]==commands[4]){
                StopMusic(msg);
            }

            if(args[1]==commands[6]){
                if(serverqueue[3].length <= 0){
                    msg.channel.send("Nothing to Recommend. Play atleast one song");
                    
                }
                else{
                    
                    let RecommendationSong = getRandomKey(serverqueue[3]);

                       
                    let recomendedSong = RecommendationSong[0][Math.floor(Math.random() * RecommendationSong[0].length)];
                    serverqueue[3].set(recomendedSong,serverqueue[3].get(recomendedSong)+1);
                    serverqueue[1][0] = recomendedSong;

                    if(serverqueue[3].size > 100){
                        let deleteSongKey = RecommendationSong[1][Math.floor(Math.random() * RecommendationSong[1].length)];
                        serverqueue[3].delete(deleteSongKey);
                    }
                    Recommendation(msg,serverqueue[1][0]);
                    playMusic(msg,serverqueue[1][0]);

                    if(serverqueue[3].size <= 3){
                        msg.channel.send("Play some more songs for better recommendation");
                    }
                }
            }
            
            

        }


    }
});

function getRandomKey(collection) {
    let mn=Number.MAX_SAFE_INTEGER,mx=0;

    for(let song of collection.keys()){
        if(mn > collection.get(song)){
            mn = collection.get(song);
            
        }
        if(mx < collection.get(song)){
            mx=collection.get(song);
        }
    }

    let minkey = [],maxkey = [];
    for(let song of collection.keys()){
        if(collection.get(song) == mn){
            minkey.push(song);
        }
        if(collection.get(song) == mx){
            maxkey.push(song);
        }
    }

    return [minkey,maxkey];
}

let StopMusic = async (msg) => {
    if(msg.guild.voice && msg.guild.voice.channel){
        await msg.guild.voice.channel.leave();
    }
    Songqueue.delete(msg.guild.id);
    return;
}

let SkipMusic = async (msg) => {
    let serverqueue = Songqueue.get(msg.guild.id);
    serverqueue[1].shift();
    playMusic(msg,serverqueue[1][0]);
}

let PauseMusic = async (Dispatcher,cmd,msg) =>{
    if(cmd == 'pause'){
        try{
            await Dispatcher.pause();
            msg.channel.send("Paused");
        }catch(err){
            console.log(err);
            msg.channel.send("Unable to pause");
        }
    }
    else{
        try{
            await Dispatcher.resume();
            msg.channel.send("Resumed");
        }catch(err){
            msg.channel.send("Unable to start");
        }
    }
}

let playMusic = async (msg,song) => {

    let serverqueue = Songqueue.get(msg.guild.id);
    if(!song){
        console.log(song);
        if(msg.guild.voice && msg.guild.voice.channel){
            await msg.guild.voice.channel.leave();
        }
        msg.channel.send("Queue is Empty");
        Songqueue.delete(msg.guild.id);
        return;
    }
    let MusicPlayer = serverqueue[0];

    
    
    
        let Dispatcher = MusicPlayer.play(ytdl('https://www.youtube.com/watch?v='+song.id,{filter: "audioonly",quality: "highestaudio"}));
        
        serverqueue[2]=Dispatcher;
        Dispatcher.on("finish", () => {
            serverqueue[1].shift();
            playMusic(msg,serverqueue[1][0]);
        });
        Dispatcher.on("error",async (err) => {
            
            msg.channel.send("Unable to play the music");
            if(msg.guild.voice && msg.guild.voice.channel){
                await msg.guild.voice.channel.leave();
            }
            Songqueue.delete(msg.guild.id);
            return;
        })

        
        
    
    

    msg.channel.send("Playing now "+song.title);   
    

}

let Recommendation = async (msg,song) => {
    const serverqueue = Songqueue.get(msg.guild.id);
    if(serverqueue){
        youtuberecommend.youtubeSearch(song.id).then(data => {
                
        if(serverqueue[3].get(data)){
            
        }
        else{
            serverqueue[3].set(data,1);
        }
            
        }).catch(err => {
            console.log(err);
        });
    }
}



const HandlingVoiceChannel = (async (msg) =>{
    const AuthorVoiceChannel = msg.member.voice.channel;
    let ConnectionsToVoiceChannel = true,dispacter=null;
    if(!AuthorVoiceChannel){
        msg.reply("You must be connected to any Voice Channel");
        ConnectionsToVoiceChannel = false;
    }
    else{
        if(msg.guild.voice && msg.guild.voice.channel){
            if(msg.member.voice.channel.id != msg.guild.voice.channelID){
                
                    msg.reply("Please join "+msg.guild.voice.channel.name+" Channel")
                
            }
        }
        else{
            try{
                dispacter = await AuthorVoiceChannel.join();
            }catch(err){
                msg.channel.send("Unable to join "+AuthorVoiceChannel.name+" Channel");
                ConnectionsToVoiceChannel = false;
            }
        }
    }
    return [ConnectionsToVoiceChannel,dispacter];
})






