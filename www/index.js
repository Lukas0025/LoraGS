var gateway = `ws://${window.location.hostname}/ws`;

var SSDO_MAX_SIZE = 230;
var MAX_OBJECTS   = 10;

var SSDO_TYPE_RAW         = 1;
var SSDO_TYPE_ASCII       = 2; 
var SSDO_TYPE_JPG         = 3;
var SSDO_TYPE_ASCII_UKHAS = 4;
var SSDO_TYPE_ASCII_JSON  = 5;

var objects = [];
var lastTime = 0;
var selected = 0;

function mallocHex(size) {
    var space = "";

    for (var i = 0; i < size; i++) {
        space += "00";
    }

    return space;
}

function setActiveDecoder(decoder) {
    document.getElementById('image').style.display   = "none";
    document.getElementById('hexdump').style.display = "none";
    document.getElementById('text').style.display    = "none";


    if (decoder == "jpeg") { //IS Image
        document.getElementById('image').style.display = "block";
        var base64 = hexToBase64(objects[selected].body);
        document.getElementById('image').src = 'data:image/jpeg;charset=utf-8;base64,' + base64;
    } else if (decoder == "text") {
        document.getElementById('text').style.display = "block";
        
        if (objects[selected].body.length > 6000) {
            document.getElementById('text').innerHTML = "File is too big";
            return;
        }
        
        document.getElementById('text').innerHTML = hex2a(objects[selected].body);
    } else if (decoder == "ukhas") {

        document.getElementById('text').style.display = "block";

        if (objects[selected].body.length > 6000) {
            document.getElementById('text').innerHTML = "File is too big";
            return;
        }

        //$$<payload>,<message number>,<time>,<latitude>,<longitude>,<altitude>,<data>,...,<last data>*<checksum>
        splited = hex2a(objects[selected].body).split("$");
        splited = splited[splited.length - 1].split("*")[0].split(",");

        var table = "<table class='table table-striped'><tr><td>payload</td><td>" + splited[0] + 
                    "</td></tr><tr><td>message number</td><td>" + splited[1] + 
                    "</td></tr><tr><td>time</td><td>" + splited[2] + 
                    "</td></tr><tr><td>latitude</td><td>" + splited[3] + 
                    "</td></tr><tr><td>longitude</td><td>" + splited[4] + "</td></tr>" +
                    "<tr><td>altitude</td><td>" + splited[5] + "</td></tr>";

        for (var i = 6; i < splited.length; i++) {
            table += "<tr><td>data" + i + "</td><td>" + splited[i] + "</td></tr>";
        }

        document.getElementById('text').innerHTML = table + "</table>";
    } else if (decoder == "ukhasespsat") {
        document.getElementById('text').style.display = "block";

        if (objects[selected].body.length > 6000) {
            document.getElementById('text').innerHTML = "File is too big";
            return;
        }

        //$$<payload>,<message number>,<time>,<latitude>,<longitude>,<altitude>,<data>,...,<last data>*<checksum>
        splited = hex2a(objects[selected].body).split("$");
        splited = splited[splited.length - 1].split("*")[0].split(",");

        var table = "<table class='table table-striped'><tr><td>payload</td><td>" + splited[0] + 
                    "</td></tr><tr><td>Transmit counter</td><td>" + splited[1] + 
                    "</td></tr><tr><td>uptime</td><td>" + splited[2] + 
                    "</td></tr><tr><td>latitude</td><td>" + splited[3] + 
                    "</td></tr><tr><td>longitude</td><td>" + splited[4] + "</td></tr>" +
                    "<tr><td>altitude</td><td>" + splited[5] + "m</td></tr>" +
                    "<tr><td>voltage</td><td>" + Number(splited[6]) / 100 + "V</td></tr>" +
                    "<tr><td>temperature</td><td>" + Number(splited[7]) / 10 + "C</td></tr>" +
                    "<tr><td>pressure</td><td>" + Number(splited[8] / 100) + "hPa</td></tr>" +
                    "<tr><td>lcounter</td><td>" + splited[9] + "</td></tr>" +
                    "<tr><td>bcounter</td><td>" + splited[10] + "</td></tr>";

        for (var i = 11; i < splited.length; i++) {
            table += "<tr><td>data" + i + "</td><td>" + splited[i] + "</td></tr>";
        }

        document.getElementById('text').innerHTML = table + "</table>";
    } else { // IS HexDump
        document.getElementById('hexdump').style.display = "block";

        if (objects[selected].body.length > 6000) {
            document.getElementById('hexdump').innerHTML = "File is too big";
            return;
        }
        
        new Hexdump(hex2a(objects[selected].body), {
            container: 'hexdump',
            base: 'hex',
            width: 8, 
            ascii: true,
            byteGrouping: 1,
            html: true,
            lineNumber: true,
            style: {
                lineNumberLeft: '<span style="color:green">',
                lineNumberRight: '</span>:',
                stringLeft: '|<span style="color:orange">',
                stringRight: '</span>|',
                hexLeft: '',
                hexRight: '',
                hexNull: '.g',
                stringNull: '.'
            }
        });
    }

    document.getElementById("Decoder").value = decoder;
}

function tuneRadio() {
    var freq     = document.getElementById("freq").value;
    var band     = document.getElementById("band").value;
    var syncword = document.getElementById("syncword").value;

    
}

function getMessageHtmlListItem(name, time, sender, size) {
    var date = new Date(time);
    
    // Hours part from the timestamp
    var hours = date.getHours();
    
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    
    // Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();
    
    // Will display time in 10:30:23 format
    var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

    return '<a href="#" onClick="openMessage(' + time + ')" id="obj' + time + '" class="list-group-item list-group-item-action active py-3 lh-sm" aria-current="true">' +
                '<div class="d-flex w-100 align-items-center justify-content-between">' +
                    '<strong class="mb-1">' + name + '</strong>' +
                    '<small>' + formattedTime + '</small>' +
                '</div>' +
                '<div class="col-10 mb-1 small">Sender: ' + sender + '<br>Size: ' + size + '</div>' +
            '</a>';
}

function getObjectByTime(time) {
    for (var i = 0; i < objects.length; i++) {
        if (objects[i] != undefined && objects[i].time == time) {
            return objects[i];
        }
    }

    return undefined;
}

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function getPacketsRatio(obj) {
    var packets_sum = 0;

    for (var i = 0; i < obj.packets.length; i++) {
        if (obj.packets[i] != undefined) {
            packets_sum++;
        }
    }

    var total = Math.ceil(obj.header.objSize / SSDO_MAX_SIZE);

    return packets_sum + " / " + total;
}

function showMessageData(obj) {
    selected = obj.header.objId;

    if (obj.header.objType == SSDO_TYPE_JPG) {
        setActiveDecoder("jpeg");
    } else if (obj.header.objType == SSDO_TYPE_ASCII_UKHAS) {
        setActiveDecoder("ukhas");
    } else if (obj.header.objType == SSDO_TYPE_ASCII) {
        setActiveDecoder("text");
    } else {
        setActiveDecoder("hexdump");
    }

    document.getElementById("sender").value = obj.header.src.toString(16); 
    document.getElementById("type").value = obj.header.objType;
    document.getElementById("packets").value = getPacketsRatio(obj);
    document.getElementById("size").value = obj.header.objSize; 
}

function openMessage(time) {
    unselectAll();

    document.getElementById("obj" + time).className = "list-group-item list-group-item-action active py-3 lh-sm";
    obj = getObjectByTime(time);

    showMessageData(obj);
}

function setHex(space, hexData, position) {
    var dataStart   = position * 2;
    var spaceArr    = space.split(""); 
    var hexDataArr  = hexData.split("");

    for (i = 0; i < hexData.length; i++) {
        spaceArr[i + dataStart] = hexDataArr[i];
    }

    return spaceArr.join("");
}

function unselectAll() {
    var els = document.getElementsByClassName("list-group-item list-group-item-action active py-3 lh-sm");

    for (var i = 0; i < els.length; i++) {
        els[i].className = "list-group-item list-group-item-action py-3 lh-sm"; 
    }
}

function hexToBase64(hexstring) {
    return btoa(hexstring.match(/\w{2}/g).map(function(a) {
        return String.fromCharCode(parseInt(a, 16));
    }).join(""));
}

function objectsCount() {
    var count = 0;

    for (var i = 0; i < objects.length; i++) {
        if (objects[i] != undefined) {
            count++;
        }
    }

    return count;
}

function objectsRotation() {
    if (objectsCount() <= 20) {
        return;
    }

    for (var i = 0; i < objects.length; i++) {
        if (objects[i] != undefined) {
            delete objects[i];
            return;
        }
    }
}

function updateObjectsUI() {
    var last   = objects.length - 1;

    if (lastTime < objects[last].time) {
        //add new list entity
        unselectAll();

        document.getElementById("messages").innerHTML = getMessageHtmlListItem(
            "#0x" + objects[last].header.objId.toString(16),
            objects[last].time,
            "0x" + objects[last].header.src.toString(16),
            objects[last].header.objSize + "B"
        ) + document.getElementById("messages").innerHTML; 

        lastTime = objects[last].time;
        selected = last;

        objectsRotation();
    }

    if (selected == last) {
        showMessageData(objects[last]);
    }
}

function onMessage(event) {
    var message = JSON.parse(event.data);
    
    if (!(message.header.objId in objects)) {
        objects[message.header.objId] = {
            header: message.header,
            packets: [],
            body:   mallocHex(message.header.objSize),
            time:   Date.now()
        }
    }

    objects[message.header.objId].body = setHex(
        objects[message.header.objId].body,
        message.body,
        message.header.pktId * objects[message.header.objId].header.pktSize
    )

    objects[message.header.objId].packets[message.header.pktId] = Date.now();

    updateObjectsUI();
}

var websocket = new WebSocket(gateway);
websocket.onmessage = onMessage;
