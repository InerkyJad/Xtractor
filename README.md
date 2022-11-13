# Xtractor (a simple wrapper to handle *.zip*, *.rar*, *.7z* files extraction)

It uses `node-unrar-js`, `adm-zip`, `7zip-bin`, `node-7z` packages under the hood to handle extraction.

## Features
- Extracting multiple files with different extensions
- Reporting of the overall progress of the extraction (of all the archives)
- Reporting the extraction progress of a single archive (the one being extracted)
- Reporting Which archive is being extracted and which file is being extracted out of it.

## how does it work
#### File Extraction
```
import { extract } from "./lib/index.js";
const files = [
    "filename.rar" // it can be .zip or .7z
]
// extract the file or files
extract(files, "./testing/out/").then(({
    filesExtracted,
    filesFailed,
    filesExtractedCount,
    filesFailedCount,
    filesSize,
    filesExtractedSize,
    filesFailedSize
}) => {
    console.log("Done");
}).catch((e) => {
    console.log("got an error");
});
```

#### Progress Tracking
```
import { addProgressListener, addProgressGroupListener } from "./lib/index.js";
let archiveProgress = 0;
let processProgress = 0;

// this will be called whenever a file is extracted from an archive, so it will be called multiple times in every extraction
addProgressListener((p) => {
    archiveProgress = Number((archiveProgress + p).toFixed(2));
    console.log(`EXTRACTED: ${archiveProgress}% OF ARCHIVE`);
});

// this will be called when the extraction of a certain file is finished
addProgressGroupListener((p) => {
    processProgress = Number((processProgress + p).toFixed(2));
    
    // it indicates the percentage of the total extraction process of all the archives
    console.log(`TOTAL PROCESS PERCENTAGE: ${processProgress}%`);
});
```

#### Current File tracking
```
import { addCurrentFileListener, addCurrentArchiveListener } from "./lib/index.js";
// this will be called when the extraction of a cetrain .zip, .rar or .7z file is started
addCurrentFileListener((file) => { // the file name will be returned
    console.log("WORKING ON FILE: " + file);
});

// this will be called when the extraction of a cetrain .zip, .rar or .7z file is started
addCurrentArchiveListener((file) => {
    // archiveProgress = 0; we reset the archive progress so that we can start counting from 0 again
    console.log("WORKING ON ARCHIVE: " + file);
});
```



# API Reference
```
extract(files: string[] | string, destination: string): Promise<unknown>
addProgressListener(func: Function): void;
addProgressGroupListener(func: Function): void;
addCurrentFileListener(func: Function): void;
addCurrentArchiveListener(func: Function): void;
```

# Build
`npm install`
`npm run test`
