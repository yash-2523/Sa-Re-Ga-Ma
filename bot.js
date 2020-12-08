const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const youtube = require('youtube-sr');
// const musicaddon = require('discord-dynamic-music-bot-addon');
const dotenv = require('dotenv').config();

var http = require('http');
var PORT = process.env.PORT || 3000
//create a server object:
http.createServer(function (req, res) {
  res.write('Hello World!'); //write a response to the client
  res.end(); //end the response
}).listen(PORT); //the server object listens on port 8080
const commands = process.env.Commands.split(',');

let Songqueue = new Map();

// const Youtube_addon = new musicaddon(process.env.Youtube_Api_key);
const client = new Discord.Client({
    partials:["MESSAGE","USER"]
})

client.on('ready', () => {
    console.log("Bot is ready");
})

client.on('message',async (msg) => {
    if(msg.content.startsWith(process.env.BOT_Prefix)){
        const args = msg.content.split(" ");
        
        if(args.length==1 || commands.indexOf(args[1]) == -1 || ((args[1]==commands[0] || args[1]==commands[1]) && args.length==2)){
            msg.channel.send("Please Provide the command");
            return;
        }
        if(args[1] != 'recommend'){
              var VoiceChannelConnection = null;
//             var proms = [];
        
//             proms.push(HandlingVoiceChannel(msg));
//             if(!VoiceChannelConnection[0]){
//                 return;
//             }
            
            

             let serverqueue = null;

//             if(serverqueue && VoiceChannelConnection[1] != null){
//                 if(serverqueue[0] !== VoiceChannelConnection[1]){
//                     serverqueue[0]=VoiceChannelConnection[1];
//                 }
//             }
            if(args[1]==commands[0] || args[1]==commands[1]){
                const songsearch = args.slice(2,args.length).join(" ");
                let songinfo;
                try{
                    let songsearchResult = await youtube.search(songsearch,{limit : 1});
                    songinfo = {
                        id: songsearchResult[0].id,
                        title: songsearchResult[0].title,
                        url: songsearchResult[0].thumbnail.url,
                    };
                    
                }catch(err){
                    console.log(err);
                    msg.channel.send("Unable to find the song");
                    return;
                }
              
              
                HandlingVoiceChannel(msg).then((data)=>{
                  VoiceChannelConnection = data;
                  serverqueue = Songqueue.get(msg.guild.id);
                  if(serverqueue && VoiceChannelConnection[1] != null){
                      if(serverqueue[0] !== VoiceChannelConnection[1]){
                          serverqueue[0]=VoiceChannelConnection[1];
                      }
                  }
                  if(serverqueue){
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
                      Songqueue.set(msg.guild.id,[VoiceChannelConnection[1],[songinfo]]);
                      serverqueue = Songqueue.get(msg.guild.id);
                      playMusic(msg,serverqueue[1][0]);
                  }
                });
                
            }

                       


        }
        else{

        }
    }
})

let playMusic = async (msg,song) => {

    const serverqueue = Songqueue.get(msg.guild.id);
    if(!song){
        await msg.guild.voice.channel.leave();
        Songqueue.delete(msg.guild.id);
        return;
    }
    let MusicPlayer = await serverqueue[0];

    
    
    
        let Dispatcher = MusicPlayer.play(ytdl('https://www.youtube.com/watch?v='+song.id,{filter: "audioonly",quality: "highestaudio"}));
        
        
        Dispatcher.on("finish", () => {
            serverqueue[1].shift();
            playMusic(msg,serverqueue[1][0]);
        });
        Dispatcher.on("error",async (err) => {
            console.log(err);
            msg.channel.send("Unable to play the music");
            await msg.guild.voice.channel.leave();
            Songqueue.delete(msg.guild.id);
            return;
        })
        
    
    

    msg.channel.send("Playing now "+song.title);   
    

}

const HandlingVoiceChannel = (async (msg) =>{
    const AuthorVoiceChannel = msg.member.voice.channel;
    let ConnectionsToVoiceChannel = true,dispacter=null;
    if(!AuthorVoiceChannel){
        msg.reply("You must be connected to any Voice Channel");
        ConnectionsToVoiceChannel = false;
    }
    else{
        if(msg.guild.voice){
            if(msg.member.voice.channel.id != msg.guild.voice.channelID){
                if(msg.guild.ownerID == msg.author.id){
                    try{
                        dispacter = await AuthorVoiceChannel.join();
                    }catch(err){
                        msg.channel.send("Unable to join "+AuthorVoiceChannel.name+" Channel");
                        ConnectionsToVoiceChannel = false
                    }
                }
                else{
                    msg.reply("Please join "+msg.guild.voice.channel.name+" Channel")
                }
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

