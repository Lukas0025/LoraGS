import websocket
import sys, getopt
import _thread
import time
import rel
import json
import codecs

SSDO_PKT_SIZE = 230

CURRENT_OBJ  = {}
CURRENT_FILE = {}
OBJ_BUFFER   = {} 
OUTDIR       = "."

def hex2bin(hexCode):
    return codecs.decode(hexCode, 'hex_codec')

def getExt(objType):
    if objType == 0:
        return "bin"
    if objType == 1:
        return "bin"
    if objType == 2:
        return "txt"
    if objType == 3:
        return "jpg"
    if objType == 4:
        return "ukhas"
    if objType == 5:
        return "json"

    return "bin"


def on_message(ws, message):

    # read message
    message = json.loads(message)

    # decode body
    body   = hex2bin(message["body"])
    sender = message["header"]["src"]
    pktId  = message["header"]["pktId"]

    # check if recived new OBJ
    if (sender not in CURRENT_OBJ) or (CURRENT_OBJ[sender] != message["header"]["objId"]):
        CURRENT_OBJ[sender]  = message["header"]["objId"]
        CURRENT_FILE[sender] = "{}/{}-s{}-t{}.{}".format(
            OUTDIR,
            message["header"]["objId"],
            sender,
            int(time.time()),
            getExt(message["header"]["objType"])
        )

        OBJ_BUFFER[sender] = bytearray(message["header"]["objSize"])

    print("[info] new message from lora GS SENDER: {}, PACKET: {}, OBJECT: {}, OBJECTSIZE: {}, PACKETSIZE: {}".format(
        sender,
        pktId,
        message["header"]["objId"],
        message["header"]["objSize"],
        message["header"]["pktSize"]
    ))

    # ok now write to buffer and save to file
    for i in range(message["header"]["pktSize"]):
        OBJ_BUFFER[sender][i + pktId * SSDO_PKT_SIZE] = body[i]

    # write buffer to file
    newFile = open(CURRENT_FILE[sender], "wb")

    # write to file
    newFile.write(OBJ_BUFFER[sender])

    newFile.close()



def on_error(ws, error):
    print("[error] {}".format(error))

def on_close(ws, close_status_code, close_msg):
    print("[info] conection to lora GS closed")

def on_open(ws):
    print("[info] conected to lora GS output dir set to {}".format(OUTDIR))

def getArgs(argv):
    opts, args = getopt.getopt(argv,"hi:o:",["host=","odir="])

    host      = None
    outputdir = "."

    for opt, arg in opts:
        if opt == '-h':
            print ('lorags.py -i <loraGS IP> -o <output dir>')
            sys.exit()
        elif opt in ("-i", "--host"):
            host = arg
        elif opt in ("-o", "--odir"):
            outputdir = arg

    if host is None:
        print ('lorags.py -i <loraGS IP> -o <output dir>')
        sys.exit()

    return host, outputdir

if __name__ == "__main__":

    host, OUTDIR = getArgs(sys.argv[1:])

    #websocket.enableTrace(True)
    
    ws = websocket.WebSocketApp(
        "ws://{}/ws".format(host),
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    ws.run_forever(dispatcher=rel, reconnect=5)  # Set dispatcher to automatic reconnection, 5 second reconnect delay if connection closed unexpectedly
    rel.signal(2, rel.abort)  # Keyboard Interrupt
    rel.dispatch()