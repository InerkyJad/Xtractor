import fs from 'fs';
import unrar from 'node-unrar-js';
import AdmZip from "adm-zip";
import sevenBin from '7zip-bin' // official 7zip-bin package
import seven from 'node-7z'



/*
* Function that will fire each time the progress of the extraction changes in each archive just as Winrar does
* */
let progress: undefined|Function = undefined;
let progressPercentage: number = 0;
export function addProgressListener(func: Function) {
    progress = func;
}


/*
* Function that will fire each time the extraction of an archive is finished (track the progress of the group of archives)
* */
let progressGroup: undefined|Function = undefined;
let progressPercentageGroup: number = 0;
export function addProgressGroupListener(func: Function) {
    progressGroup = func;
}


/*
* Callback to report which file is currently being extracted
* */
let currentFile: undefined|Function
export function addCurrentFileListener(func: Function) {
    currentFile = func;
}


/*
* Callback to report which archive is currently being extracted
* */
let currentArchive: undefined|Function
export function addCurrentArchiveListener(func: Function) {
    currentArchive = func;
}





/*
* Merge Two Buffers or more into one
* */
export function mergeBuffers(buffers: any[]): Buffer {
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
    const result = Buffer.alloc(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        buffer.copy(result, offset);
        offset += buffer.length;
    }
    return result;
}



/*
* Extract Rar Function
* */
export async function extractRar (file: string, destination: string, options: ExtractorOptions): Promise<boolean|string> {
    return new Promise(async (resolve, reject) => {

        try {
            // make sure destination has / at the end
            if (!destination.endsWith('/')) destination += '/';

            // Create a readable stream from the rar file, the stream will be a 50MB buffer
            const stream = fs.createReadStream(file, {
                highWaterMark: 50 * 1024 * 1024
            });

            /*
            * Extraction function Wrapper
            * */
            const extract = async (buffer: Buffer) => {
                const extractor = await unrar.createExtractorFromData({
                    data: buffer
                });
                const list = extractor.getFileList();
                const listArcHeader = list.arcHeader;
                const fileHeaders = [...list.fileHeaders];


                // calculate the total size of all files
                let totalSize = 0;
                for (let i = 0; i < fileHeaders.length; i++) {
                    totalSize += fileHeaders[i].packSize;
                }


                for (let file of fileHeaders) {

                    // if there is a current file callback call it
                    if (options.currentFile) options.currentFile(file.name);


                    const extracted = extractor.extract({ files: [file.name] });
                    const files = [...extracted.files];
                    const extractedFile = files[0];
                    if (file.flags.directory) {
                        fs.mkdirSync(destination + file.name, { recursive: true });
                    } else {
                        const path = destination + file.name;
                        // @ts-ignore
                        const buffer = Buffer.from(extractedFile.extraction);

                        // prepare the paths
                        const folders = path.split('/');
                        folders.pop();
                        const folderPath = folders.join('/');

                        // create the folders if they do not exist
                        fs.mkdirSync(folderPath, { recursive: true });

                        // write the file
                        fs.writeFileSync(path, buffer);
                    }

                    // if there is a progress callback call it
                    if (options.progress) {
                        const p = Number(((file.packSize / totalSize) * 100).toFixed(2));
                        progressPercentage += p;
                        options.progress(Math.min(100, p));
                    }
                }

                // if there is a progress callback call it
                if (options.filePercentage && progressGroup) progressGroup(Math.min(100, options.filePercentage));
                resolve(true);
            }

            // Create an empty shared buffer (it will contain the full file at the end of the execution)
            let sharedBuffer = Buffer.alloc(0);

            stream.on('data', async (data) => {
                sharedBuffer = mergeBuffers([sharedBuffer, data])
            });

            stream.on('end', () => {
                extract(sharedBuffer);
            });

        } catch (error) {
            reject(error);
        }

    });
}



/*
* Extract Zip Function
* */
export async function extractZip (file: string, destination: string, options: ExtractorOptions): Promise<boolean|string> {
    return new Promise(async (resolve, reject) => {

        try {
            // make sure destination has / at the end
            if (!destination.endsWith('/')) destination += '/';

            // reading archive
            const zip = new AdmZip(file);
            const zipEntries = zip.getEntries();


            // calculate the total size of all files
            let totalSize = 0;
            for (let i = 0; i < zipEntries.length; i++) {
                totalSize += zipEntries[i].header.compressedSize;
            }


            zipEntries.forEach(function (zipEntry) {
                // report file name if there is a current file callback
                if (options.currentFile) options.currentFile(zipEntry.name);

                // if the entry is a directory then create it if it does not exist
                if (zipEntry.isDirectory) {
                    fs.mkdirSync(destination + zipEntry.entryName, { recursive: true });
                }
                // if the entry is a file then extract it
                else {
                    const path = destination + zipEntry.entryName;
                    const folders = path.split('/');
                    folders.pop();
                    const folderPath = folders.join('/');
                    fs.mkdirSync(folderPath, { recursive: true });
                    zip.extractEntryTo(zipEntry.entryName, folderPath, false, true);
                }

                // if there is a progress callback call it
                if (options.progress) {
                    const p = Number(((zipEntry.header.compressedSize / totalSize) * 100).toFixed(2));
                    progressPercentage += p;
                    options.progress(Math.min(100, p));
                }
            });


            // if there is a progress callback call it
            if (options.filePercentage && progressGroup) progressGroup(Math.min(100, options.filePercentage));
            resolve(true);

        } catch (error) {
            reject(error);
        }

    });
}



/*
* Extract 7z Function
* */
export async function extract7z (file: string, destination: string, options: ExtractorOptions): Promise<boolean|string> {
    return new Promise(async (resolve, reject) => {
        try {
            // make sure destination has / at the end
            if (!destination.endsWith('/')) destination += '/';

            // create the 7z stream
            const st = seven.extractFull(file, destination, {
                $bin: sevenBin.path7za,
                $progress: true
            });

            // get the file size using fs
            let totalSize = fs.statSync(file).size;

            // listen to the progress event
            st.on('data', (data: any) => {
                // if there is a current file callback call it
                const fileName = data.file.split('/').pop();
                if (options.currentFile) options.currentFile(fileName);
            });

            // listen to the progress event and report the percentage of the file
            st.on('progress', function (progress) {
                // if there is a progress callback call it
                if (options.progress) {
                    options.progress(progress.percent - progressPercentage);
                    progressPercentage = progress.percent;
                }
            })

            st.on('end', function () {
                // if there is a progress callback call it
                if (options.filePercentage && progressGroup) progressGroup(Math.min(100, options.filePercentage));
                resolve(true);
            })

        } catch (error) {
            reject(error);
        }
    });
}





/*
* Function that recives the files and the destination and extracts them
* */
export function extract(files: string[]|string, destination: string) {
    return new Promise((resolve, reject) => {

        /*
        * GLOBALS
        * */
        let filesToExtract: string[] = [];
        let filesExtracted: string[] = [];
        let filesFailed: string[] = [];
        let filesExtractedCount: number = 0;
        let filesFailedCount: number = 0;
        let filesSize: number = 0;
        let filesExtractedSize: number = 0;
        let filesFailedSize: number = 0;


        /*
        * Determine the files, their nature, the destination and the options
        * */
        if (!files) reject('No files specified');
        if (!destination) reject('No destination specified');

        // if the file is a string turn into an array
        if (typeof files === 'string') files = [files];

        // loop through the files if any of them doest exist reject
        for (let file of files) {
            // if file doest end end with [.rar, .zip, .7z] reject
            if (!file.endsWith('.rar') && !file.endsWith('.zip') && !file.endsWith('.7z')) reject('Invalid file type');
            // if file doest exist reject
            if (!fs.existsSync(file)) reject(`File ${file} does not exist`);
        }

        // if destination doest exist reject
        if (!fs.existsSync(destination)) reject(`Destination ${destination} does not exist (Note: The destination must be an existing directory)`);


        /*
        * Set GLOBALS
        * */
        filesToExtract = files;
        filesSize = filesToExtract.reduce((acc, file) => acc + fs.statSync(file).size, 0);



        /*
        * After extraction
        * */
        const updateStates = (file: string, state: boolean) => {
            if (state) {
                filesExtracted.push(file);
                filesExtractedCount++;
                filesExtractedSize += fs.statSync(file).size;
            } else {
                filesFailed.push(file);
                filesFailedCount++;
                filesFailedSize += fs.statSync(file).size;
            }

            // if there is still a file in the Files to extract list, extract it
            if (filesToExtract.length > 0) {
                extractFile(filesToExtract[0])
            } else {
                progressPercentage = 100 - progressPercentage;
                if (progress) progress(progressPercentage);
                resolve({
                    filesExtracted,
                    filesFailed,
                    filesExtractedCount,
                    filesFailedCount,
                    filesSize,
                    filesExtractedSize,
                    filesFailedSize
                });
            }
        }


        /*
        * Extract the files
         */
        const extractFile = (file: string) => {
            // set the file percentage to 0
            progressPercentage = 0;

            // calculate the file percentage out of the total size
            let filePercentage = (fs.statSync(file).size / filesSize) * 100;

            // if the currentArchive callback is set call it
            if (currentArchive) currentArchive(file.split('/').pop());

            // if file is a rar file
            if (file.endsWith('.rar')) {
                // if the file ends with .rar
                extractRar(file, destination, {
                    progress,
                    filePercentage,
                    currentFile
                }).then(() => {
                    updateStates(file, true)
                }).catch((error) => {
                    updateStates(file, false)
                });
            } else if (file.endsWith('.zip')) {
                // if the file ends with .zip
                extractZip(file, destination, {
                    progress,
                    filePercentage,
                    currentFile
                }).then(() => {
                    updateStates(file, true)
                }).catch((error) => {
                    updateStates(file, false)
                });
            } else if (file.endsWith('.7z')) {
                // if the file ends with .7z
                extract7z(file, destination, {
                    progress,
                    filePercentage,
                    currentFile
                }).then(() => {
                    updateStates(file, true)
                }).catch((error) => {
                    updateStates(file, false)
                });
            }

            // remove file from list
            filesToExtract = filesToExtract.filter(f => f !== file)
        }

        // extract the first file
        extractFile(filesToExtract[0])
    });
}



interface ExtractorOptions {
    progress: undefined|Function;
    filePercentage: number;
    currentFile: undefined|Function;
}


export default extract