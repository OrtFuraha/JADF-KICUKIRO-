#!/bin/bash
cd /Users/mymac/Desktop/govcert-project
/usr/local/bin/node sync-google-sheet.js >> logs/sync.log 2>&1
