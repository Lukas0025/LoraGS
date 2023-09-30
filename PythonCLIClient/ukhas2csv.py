import csv
import datetime
import os
import glob
import sys, getopt

def getArgs(argv):
    opts, args = getopt.getopt(argv,"hi:o:",["input=","output="])

    path    = None
    outFile = None

    for opt, arg in opts:
        if opt == '-h':
            print ('Convert ukhas files to csv telemetry file')
            print()
            print ('ukhas2csv.py -i <input dir> -o <output csv file>')
            sys.exit()
        elif opt in ("-i", "--input"):
            path = arg
        elif opt in ("-o", "--output"):
            outFile = arg

    if path is None or outFile is None:
        print ('ukhas2csv.py -i <input dir> -o <output csv file>')
        sys.exit()

    return path, outFile


def colNum(array):
    lenAbs = 0
    for row in array:
        if len(row) > lenAbs:
            lenAbs = len(row)

    return lenAbs

if __name__ == "__main__":
    path, outFile = getArgs(sys.argv[1:])

    files = glob.glob("{}/*.ukhas".format(path))
    data  = []

    # read files
    for file in files:
        #c_time = os.path.getctime(file)
        c_time = int(file.split(".")[0].split("t")[-1])
        dt_c   = datetime.datetime.fromtimestamp(c_time)
        print('Reading UKHAS file {} created on: {}'.format(file, dt_c))

        with open(file) as f:
            f_data = f.read().split("$")[-1].split("*")[0].split(",")
            f_data.insert(0, c_time)
            data.append(f_data)

    # write to file
    with open(outFile, 'w', newline='') as file:
        writer = csv.writer(file)
        cols   = colNum(data)

        #$$<payload>,<message number>,<time>,<latitude>,<longitude>,<altitude>,<data>,...,<last data>*<checksum>
        field = ["walltime", "payload", "message number", "time", "latitude", "longitude", "altitude"]

        for col in range(cols - len(field)):
            field.append("data{}".format(col))
        
        writer.writerow(field)

        for col in data:
            writer.writerow(col)
