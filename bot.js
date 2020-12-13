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

client.on('ready', () => {
    console.log("Bot is ready");
    Songqueue.clear();
})

client.on('message',async (msg) => {
    if(msg.content.startsWith(process.env.BOT_Prefix)){
        const args = msg.content.split(" ");
        
        if(args.length==1 || commands.indexOf(args[1]) == -1 || ((args[1]==commands[0] || args[1]==commands[1]) && args.length==2)){
            msg.channel.send("Please Provide the command");
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
                        
                        Songqueue.set(msg.guild.id,[VoiceChannelConnection[1],[songinfo],null,[]]);
                        serverqueue = Songqueue.get(msg.guild.id);
                        playMusic(msg,serverqueue[1][0]);
                        Recommendation(msg,songinfo);
                    }
                }
                else{
                    console.log("leave ");
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
                msg.channel.send("Nothing to ",toString(args[1]));
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

                    serverqueue[3] = shuffleArray(serverqueue[3]);
                    
                    serverqueue[1][0] = serverqueue[3][0];
                    serverqueue[3].shift();
                    Recommendation(msg,serverqueue[1][0]);
                    playMusic(msg,serverqueue[1][0]);

                    if(serverqueue[3] <= 3){
                        msg.channel.send("Play some more somgs for better recommendation");
                    }
                }
            }
            
            

        }


    }
});

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
                
                serverqueue[3].push(data);
            
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

client.login(process.env.Token);




