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
let webhooks = [];

settings.listeners.forEach(element => {
    if(element.webhook != ""){
        webhooks.push(new webhook.Webhook(element.webhookAddress));
    }
});




//const Hook = new webhook.Webhook(settings.webhookEndpoint);

// Create a client with our options
const client = new tmi.client(options);
const _personalAliases = ["durok"];
const _mcdmAliases = ["matt","mcdm"];
const personalAliases = _personalAliases.join("|");
const mcdmAliases = _mcdmAliases.join("|");

let questionsOpen = false;
let listenForMentions = true;


// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    // Remove whitespace from chat message
    let messageString = msg.trim();

    if(messageString[0] != '!'){ //check if they're trying to activate a command
        settings.listeners.forEach((element, index) => {
            if(element.channels.find(channel => channel == target.substr(1))){
                console.log("searching in " + element.name);
                if(element.currentlyListening){
                    if (new RegExp(element.aliases.join("|")).test(messageString.toLowerCase())) {
                        // At least one match
                        console.log(`* Name was mentioned`);
                        //const sender = target.<display-name>;
                        let webhookmsg = new webhook.MessageBuilder()
                            .setName("Zarnoth Bot")
                            .setColor(element.color)
                            .addField(context["display-name"] + " " +element.messageText, messageString);
                        if(element.discordUserID != null)
                            webhookmsg.setText(`<@${element.discordUserID}>`);
                        webhooks[index].send(webhookmsg);
                            //Hook.send(webhookmsg);
                        
                    }
                }
            }
        });
    }
    /*
    if(!listenForMentions)
            return;
        if (new RegExp(personalAliases).test(messageString.toLowerCase())) {
            // At least one match
            console.log(`* Name was mentioned`);
            //const sender = target.<display-name>;
            const webhookmsg = new webhook.MessageBuilder()
                .setName("Zarnoth Bot")
                .setColor("#3498DB")
                .setText("<@200261716318224385>")
                .addField(context["display-name"] + " mentioned you", messageString);
            Hook.send(webhookmsg);
        }
        if (new RegExp(mcdmAliases).test(messageString.toLowerCase())) {
            // At least one match
            console.log(`* Name was mentioned`);
            //const sender = target.<display-name>;
            const webhookmsg = new webhook.MessageBuilder()
                .setName("Zarnoth Bot")
                .setColor("#CD6155")
                .addField(context["display-name"] + " mentioned Matt", messageString);
            Hook.send(webhookmsg);
        }
        return;
    }
    */



    if(messageString[0] != '!'){ //check if they're trying to activate a command
        return;
    }
    messageString = messageString.substr(1);
    const commandTriggered = messageString.split(" ")[0];
    // If the command is known, let's execute it
    switch (commandTriggered){
        case "Q":
            if(!questionsOpen)
                break;
            const questionString = messageString.substr(2);
            if(questionString.length == 0) //make sure they actually ask something
                return;
            const webhookmsg = new webhook.MessageBuilder()
                .setName("Zarnoth Bot")
                .setColor("#F4D03F")
                .addField(context["display-name"] + " asks:", questionString);
            Hook.send(webhookmsg);
            client.say(target, `${context["display-name"]} your question has been sent`);
            console.log(`* Executed ${commandTriggered} command`);
            break;
        case "openQ":
            if(checkIfMod(context, target)){
                questionsOpen = true;
                client.say(target, `Questions are now open! Use !Q to submit your questions`);
                console.log(`* Executed ${commandTriggered} command`);
            }
            break;
        case "closeQ":
            if(checkIfMod(context, target)){
                questionsOpen = false;
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
    // if (commandTriggered === 'Q') {
        
    // } else {
        
    // }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}
function checkIfMod(context, target){
    return context.mod == true || context.username == target.substr(1);
}

function makeListener(name, channels, aliases, webhookURL, shouldBeListening, messageText, color, discordUserID = null){
    let listener = {
        name : name,
        channels : channels,
        aliases : aliases,
        webhookAddress : webhookURL,
        currentlyListening : shouldBeListening,
        messageText : messageText,
        color: color,
        discordUserID : discordUserID
    };
    return listener;
}
function makeSettings(){
    let settings = {
        listeners : []
    };
    settings.listeners[0] = makeListener("","","","","");
    return settings;
}