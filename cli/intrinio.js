#!/usr/bin/env node
'use strict';

let httpRequest = require('request');
let commandLine = require('commander');
let logger = require('winston');
let fs = require('fs');

let credentials = require('../credentials.json');

let setupLogger = function() {
    let options = {
        level: commandLine.verbose ? 'debug' : 'info',
        colorize: true,
        message: '',
        formatter: function(options) {
            let message = options.message;
            if (options.level !== 'info' ) {
                message = options.level + ': ' + message;
            }

            return logger.config.colorize(options.level, undefined !== message ? message : '');
        }
    };
    logger.remove(logger.transports.Console);
    logger.add(logger.transports.Console, options);
    logger.cli();
};

let getCompaniesForPage = function(companies, pageNumber, callback) {
    httpRequest.get('https://api.intrinio.com/companies?page_number=' + pageNumber,
        function(error, response, rawBody) {
            if (error) {
                logger.error('There was an error retrieving the stock information:', error);
            }
            else {
                let body = JSON.parse(rawBody);
                if (companies.length === 0) {
                    companies = body.data;
                }
                else {
                    companies = companies.concat(body.data);
                }

                logger.info('Retrieved page %s of %s. Results on page: %s. Total Results: %s', pageNumber,
                body.total_pages, body.result_count, companies.length);
                if (pageNumber !== body.total_pages) {
                    pageNumber++;
                    getCompaniesForPage(companies, pageNumber, callback);
                }
                else {
                    callback(JSON.stringify(companies));
                }
            }
    })
    .auth(credentials.username, credentials.password, false);
};

let run = function(file) {
    setupLogger();
    logger.info('Retrieving stock information');
    let pageNumber = 1;
    let companies = [];
    getCompaniesForPage(companies, pageNumber, (allCompanies) => {
        fs.writeFile(file, allCompanies, function(error) {
            if (error) {
                logger.error('There was an error writing to the file "%s"', file, JSON.stringify(error));
                return;
            }

            logger.info('Successfully wrote all company information to %s.', file);
        });
    });
};

commandLine.arguments('<file>')
    .description('Program for accessing the intrinio companies API endpoint.')
    // .option('-f, --file', 'The file to write the results to')
    // .option('-a, --all', 'Retrieve all pages of data')
    // .option('-p, --page', 'For paginated results the page number of results to retrieve.')
    // .option('-t, --ticker', 'Query for a specific stock ticker (aka symbol)')
    .option('-v, --verbose', 'Toggles verbose output.')
    .action((file) =>run(file))
    .parse(process.argv);
