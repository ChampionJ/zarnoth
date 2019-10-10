const {
    performance,
    PerformanceObserver
} = require('perf_hooks');
const tmi = require("tmi.js");
const options = require("./options");
const fs = require('fs');

const settingsPath = "settings.json";

let settings;
//check settings
try {
    if(fs.existsSync(settingsPath)){
        settings = fs.readFileSync('settings.json');
        settings = JSON.parse(settings);
    } else {
        settings = makeSettings();
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
    }
} catch(err){
    console.log(err);
}

const webhook = require("webhook-discord");

// Create a client with our options
const client = new tmi.client(options);
const _personalAliases = ["durok"];
const _mcdmAliases = ["matt","mcdm"];
const personalAliases = _personalAliases.join("|");
const mcdmAliases = _mcdmAliases.join("|");

let questionsOpen = false;
let listenForMentions = true;
let date = new Date();


// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot
    if(context["display-name"] == "Moobot") { return;}
    let globalIgnored = settings.ignoredUsers.find(user => user == context.username);
    if(globalIgnored != undefined){
        return;
    }
    let timer = performance.now();
    // Remove whitespace from edges of chat message
    let messageString = msg.trim();

    if(messageString[0] != '!'){ //check if they're trying to activate a command
        let filteredListeners = settings.listeners.filter(obj => {return obj.channels.find(channel => channel == target.substr(1));});
        filteredListeners.forEach((element) => {
            
            if(element.currentlyListening){
                if(element.ignoreMods && context.mod){
                    return;
                }
                let filteredIgnored = element.ignoredUsers.find(user => user == context.username);
                if(filteredIgnored != undefined){
                    return;
                }
                let regString = "\\b";
                regString += element.aliases.join("\\b|\\b");
                regString += regString = "\\b";

                if (new RegExp(regString).test(messageString.toLowerCase())) {
                
                    // At least one match
                    console.log(`* Name was mentioned`);
                    //const sender = target.<display-name>;
                    let webhookmsg = new webhook.MessageBuilder()
                        .setName("Zarnoth")
                        .setColor(element.color)
                        .addField(context["display-name"] + " " +element.messageText + " in " + target, messageString);
                    if(element.discordUserID != null)
                        webhookmsg.setText(`<@${element.discordUserID}>`);
                    
                    let hook = new webhook.Webhook(element.webhookAddress);
                    hook.send(webhookmsg);
                }
            }
            
        });
        return;
    }

    messageString = messageString.substr(1);
    const commandTriggered = messageString.split(" ")[0];

    let commandsettings = settings.commands.find((commandsSettings, index) => commandsSettings.channel == target.substr(1));
    if(commandsettings === undefined)
        return;
    
    // If the command is known, let's execute it
    switch (commandTriggered){
        case "QUESTION":
        case "Q":
            if(!commandsettings.questionsSettings.currentlyListening)
                break;

            const questionString = messageString.substr(commandTriggered.length);
            if(questionString.length == 0) //make sure they actually ask something
                return;
            const webhookmsg = new webhook.MessageBuilder()
                .setName("Zarnoth")
                .setColor("#F4D03F")
                .addField(context["display-name"] +" "+ commandsettings.questionsSettings.messageText + " in " + target, questionString);
            let hook = new webhook.Webhook(commandsettings.questionsSettings.webhookAddress);
            hook.send(webhookmsg);
            //client.say(target, `${context["display-name"]} your question has been sent`);
            console.log(`* Executed ${commandTriggered} command`);
            break;
        case "openQ":
            if(checkIfMod(context, target)){
                commandsettings.questionsSettings.currentlyListening = true;
                client.say(target, `Questions are now open! Use !Q to submit your questions`);
                console.log(`* Executed ${commandTriggered} command`);
            }
            break;
        case "closeQ":
            if(checkIfMod(context, target)){
                commandsettings.questionsSettings.currentlyListening = false;
                client.say(target, `Questions are now closed!`);
                console.log(`* Executed ${commandTriggered} command`);
            }
            break;
        case "toggleMentions":
            if(checkIfMod(context, target)){
                listenForMentions = !listenForMentions;
                let statement = listenForMentions ? "you have enabled listening for mentions" : "you have disabled listening for mentions";
                client.say(target, statement);
                console.log(`* Executed ${commandTriggered} command`);
            }
            break;
        default:
            console.log(`* Unknown command ${commandTriggered}`);
        
    }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}
function checkIfMod(context, target){
    return context.mod == true || context.username == target.substr(1);
}

function makeListener(name, channels, aliases, webhookURL, shouldBeListening, messageText, color, discordUserID = null, ignoredUsers = null, ignoreMods = false){
    let listener = {
        name : name,
        channels : channels,
        aliases : aliases,
        webhookAddress : webhookURL,
        currentlyListening : shouldBeListening,
        messageText : messageText,
        color: color,
        discordUserID : discordUserID,
        ignoredUsers : ignoredUsers,
        ignoreMods : ignoreMods
    };
    return listener;
}
function makeQuestionsSettings(){
    let questionsSettings = {
        webhookAddress : "",
        currentlyListening : true,
        messageText : "",
        color: "",
    };
    return questionsSettings;
}

function makeCommands(){
    let commands = {
        channel : "",
        questionsSettings : [],
        ignoredUsers : []
    };
    commands.questionsSettings[0] = makeQuestionsSettings();
    return commands;
}
function makeSettings(){
    let settings = {
        listeners : [],
        commands : []
    };
    settings.listeners[0] = makeListener("","","","","");
    settings.commands[0] = makeCommands("")
    return settings;
}