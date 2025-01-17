const picomatch = require("picomatch");

const err = new Error("Unbalanced brackets in input");

const parseList = (raw) => {
    if (!raw || !raw.trim()) {
        return [];
    }
    if (!raw.includes(",") && !raw.includes("\n")) {
        return [raw];
    }
    if (raw.includes("\n")) {
        // if split on newlines, no need to parse for internal commas
        return raw.split("\n").map((item) => item.trim());
    }

    let bracketCount = 0;
    const list = [];
    let current = "";
    // don't split on `,` inside brackets-- that breaks glob patterns
    // this builds an array of strings between commas and newlines,
    //   but not inside brackets
    for (const char of raw) {
        if (bracketCount < 0) {
            throw err;
        }
        switch (char) {
            case ",":
                // if we're not inside brackets, add the current string to the list
                //   and reset the current string
                if (bracketCount === 0) {
                    list.push(current.trim());
                    current = "";
                    continue;
                }
                break;
            case "(":
            case "[":
            case "{":
                // increment the bracket count
                bracketCount++;
                break;
            case ")":
            case "]":
            case "}":
                // decrement the bracket count
                bracketCount--;
                break;
        }
        current += char;
    }
    if (current) {
        list.push(current.trim());
    }
    if (bracketCount !== 0) {
        throw err;
    }
    return list.map((item) => item.trim());
};

module.exports = ({
    extensionsRaw,
    exactFilesRaw,
    globsRaw,
    inputFiles,
    invert,
    core,
}) => {
    const extensions = parseList(extensionsRaw);
    const exactFiles = parseList(exactFilesRaw);
    const globMatcher = picomatch(parseList(globsRaw));
    const directories = exactFiles.filter((name) => name.endsWith("/"));
    const result = inputFiles.filter((name) => {
        const matched =
            extensions.some((ext) => name.endsWith(ext)) ||
            exactFiles.includes(name) ||
            directories.some((dir) => name.startsWith(dir)) ||
            globMatcher(name);
        return matched === !invert;
    });
    core.info(`Filtered Files: ${JSON.stringify(result)}`);
    return result;
};
