#!/bin/bash

# Need to provide execute rights to this script before executing it locally
# $1 = no. of iterations
INPUT_NO_OF_ITERATIONS=$1
NO_OF_ITERATIONS=${INPUT_NO_OF_ITERATIONS:-10}

for i in {1..10}
    do
        echo "start iteration: $i";
        WORKFLOW=WORKFLOW_COMPLETE_SCAN yarn start;
        sleep 3600;
        WORKFLOW=WORKFLOW_COMPLETE_WITH_TRANSCRIPTION_SCAN yarn start;
        sleep 3600;
        WORKFLOW=WORKFLOW_RSS_SCAN yarn start;
        sleep 3600;
        echo "end iteration: $i";
    done
