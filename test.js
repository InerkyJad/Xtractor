import { extract, addProgressListener, addCurrentFileListener, addProgressGroupListener, addCurrentArchiveListener } from "./lib/index.js"; // this is your import line

/*
* This is a test file for the extractor library, it will log all available information, a log example can be found in the bottom of this file
* */
let archiveProgress = 0;
let processProgress = 0;
let currentFile = "";
let currentArchive = "";


// this will be called when the extraction of a cetrain .zip, .rar or .7z file is started
addCurrentFileListener((file) => { // the file name will be returned
    console.log("WORKING ON FILE: " + file);
});


// this will be called whenever a file is extracted from an archive, so it will be called multiple times in every extraction
addProgressListener((p) => {
    archiveProgress = Number((archiveProgress + p).toFixed(2));
    console.log(`EXTRACTED: ${archiveProgress}% OF ARCHIVE`);
});

// this will be called when the extraction of a cetrain .zip, .rar or .7z file is started
addCurrentArchiveListener((file) => {
    archiveProgress = 0; // we reset the archive progress so that we can start counting from 0 again
    console.log("WORKING ON ARCHIVE: " + file);
});

// this will be called when the extraction of a certain file is finished
addProgressGroupListener((p) => {
    processProgress = Number((processProgress + p).toFixed(2));
    console.log(`TOTAL PROCESS PERCENTAGE: ${processProgress}% (it indicates the percentage of the total extraction process of all the archives)`);
});



const files = [
    "filename.rar"
]


// it can take a file parameter as a single string 'file.ext' or multiple files as an array ['file1.ext', 'file2.ext'] and a destination folder as a string 'folder'
extract(files, "./testing/out/").then((r) => {
    console.log("############################  DONE  #####################################");
    // set everything to 100% if it's not already
}).catch((e) => {
    console.log("Oh no!");
});