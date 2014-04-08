#!/usr/bin/env node

/*!
 * heartbleed-detect.js by Rich Trott, (c) 2013 Regents of University of California, MIT License
 */

var http = require("http"),
    https = require("https"),
    url = require("url"),
    argvLength = process.argv.length;

function usage( errorMessage ) {
    if (errorMessage) {
        console.error("\nError: " + errorMessage + ".\n");
    }
    console.error("Usage: heartbleed-detect.js url1 [url2 ...]");
    console.error("    url1 ...: URLs to inspect");
    console.error("\nExample: heartbleed-detect.js http://www.example.com/");
}

function checkOpensslVersion( host ) {
    var opensslVersionRegex = /OpenSSL\/(\d+\.\d+\.\d+\S*)/i;
    var opensslVulnerableVersionRegex = /^1\.0\.1[a-f]?$/;

    return function ( res ) {
        var serverHeader = res.headers.server;
        var opensslVersion;

        if (typeof res.headers.server !== "string") {
            console.error("No server header returned by " + host + ".");
            return;
        }

        opensslVersion = opensslVersionRegex.exec(serverHeader);
        if (!opensslVersion) {
            console.error(host + " does not advertise an OpenSSL version.");
            return;
        }

        if (opensslVulnerableVersionRegex.exec(opensslVersion[1])) {
            console.log(host + " is running OpenSSL version " + opensslVersion[1] + " which is VULNERABLE.");
        } else {
            console.log(host + " is running OpenSSL version" + opensslVersion[1] + " which is NOT vulnerable.");
        }
    };
}

function dispatchRequest( targetUrl ) {
    var reqObj = false,
        options,
        req;

    options = url.parse( targetUrl );
    options.method = "HEAD";

    switch (options.protocol) {
        case "http:":
            reqObj = http;
            break;
        case "https:":
            reqObj = https;
            options.rejectUnauthorized = false;
            break;
    }

    if ( reqObj ) {
        req = reqObj.request( options, checkOpensslVersion( options.host ));
        req.on("error", function(e) {
            console.error("Error on " + options.host + ": " + e.message);
        });
        req.on("socket", function (socket) {
            socket.setTimeout(1000);
            socket.on("timeout", function() {
                console.error("Socket timeout; hanging up.");
                req.abort();
            });
        });
        req.end();
    } else {
        console.error("Could not determine protocol: " + options.protocol);
    }
}

if (argvLength < 3) {
    usage();
    return;
}

for (i = 2; i<argvLength; i++) {
    dispatchRequest(process.argv[i]);
}
