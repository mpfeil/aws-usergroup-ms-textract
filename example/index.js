const logSymbols = require('log-symbols');
const chalk = require('chalk');
const Table = require('cli-table3');
// const AWS = require('aws-sdk');
// const s3 = new AWS.S3();
// const Textract = new AWS.Textract();

// const params = {
//   Document: {
//     S3Object: {
//       Bucket: 'buildsimple-textract-test',
//       Name: 'Rechnung_Computeruniverse.jpg'
//     }
//   },
//   FeatureTypes: ["TABLES", "FORMS"]
// }

// const params = {
//   Bucket: 'buildsimple-textract-test'
// }

// s3.listObjectsV2(params, function (err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else console.log(data);           // successful response
// })

// Textract.analyzeDocument(params, function (response, error) {
//   console.log(response);
//   console.log(error);
// });

const info = chalk.green.bold;

// const textractJson = require('./textract-response-forms.json');
// const textractJson = require('./sample_output/example-3.json');
// const textractJson = require('./sample_output/example-propertySection2.json');

const textractJson = require('./output/example-1.jpg-textract.json');

// AWS Textract BlockTypes (https://docs.aws.amazon.com/textract/latest/dg/API_Block.html)
const BlockTypes = Object.freeze({
  PAGE: 'PAGE',
  WORD: 'WORD',
  LINE: 'LINE',
  KEY_VALUE_SET: 'KEY_VALUE_SET',
  TABLE: 'TABLE',
  CELL: 'CELL'
});

// AWS Textract RelationshipTypes https://docs.aws.amazon.com/textract/latest/dg/API_Relationship.html
const RelationshipTypes = Object.freeze({
  VALUE: 'VALUE',
  CHILD: 'CHILD'
});

const blocks = textractJson.Blocks;

const pages = blocks.filter(block => block.BlockType === BlockTypes.PAGE);
const tables = blocks.filter(block => block.BlockType === BlockTypes.TABLE);
const cells = blocks.filter(block => block.BlockType === BlockTypes.CELL);
const lines = blocks.filter(block => block.BlockType === BlockTypes.LINE);
const words = blocks.filter(block => block.BlockType === BlockTypes.WORD);
const key_value_sets = blocks.filter(block => block.BlockType === BlockTypes.KEY_VALUE_SET);

// Information about what`s in your document
console.log(logSymbols.info, `Found ${info(pages.length)} ${BlockTypes.PAGE}(s)`);
console.log(logSymbols.info, `Found ${info(tables.length)} ${BlockTypes.TABLE}(s)`);
console.log(logSymbols.info, `Found ${info(cells.length)} ${BlockTypes.CELL}(s)`);
console.log(logSymbols.info, `Found ${info(lines.length)} ${BlockTypes.LINE}(s)`);
console.log(logSymbols.info, `Found ${info(words.length)} ${BlockTypes.WORD}(s)`);
console.log(logSymbols.info, `Found ${info(key_value_sets.length)} ${BlockTypes.KEY_VALUE_SET}(s)`);

const getRelationship = function getRelationship(block, type) {
  if (!block.hasOwnProperty('Relationships')) {
    return [];
  }
  if (type === undefined || type === '' || type === null) {
    return block.Relationships;
  }

  let childs;
  if (type === RelationshipTypes.CHILD) {
    childs = block.Relationships.filter(relationship => relationship.Type === RelationshipTypes.CHILD);
  }

  if (type === RelationshipTypes.VALUE) {
    childs = block.Relationships.filter(relationship => relationship.Type === RelationshipTypes.VALUE);
  }

  return (childs.length === 0) ? [] : childs[0].Ids;
}

const keys = key_value_sets.filter(kvs => kvs.EntityTypes.includes('KEY'));

keys.forEach(kvs => {
  const childIds = getRelationship(kvs, RelationshipTypes.CHILD);
  const valueIds = getRelationship(kvs, RelationshipTypes.VALUE);

  let keyText = [];
  childIds.forEach(childId => {
    keyText.push(blocks.filter(block => block.Id === childId)[0].Text)
  });

  let valueText = [];
  valueIds.forEach(valueId => {
    const valueBlock = blocks.filter(block => block.Id === valueId);
    const valueChildIds = getRelationship(valueBlock[0], RelationshipTypes.CHILD);
    if (valueChildIds !== undefined) {
      valueChildIds.forEach(valueChildId => {
        const child = blocks.filter(block => block.Id === valueChildId);
        valueText.push(child[0].Text);
      });
    }
  });

  console.log(`${chalk.red('Key')}/${chalk.green('Value')}: ${chalk.red(keyText.join(' '))} / ${chalk.green(valueText.join(' '))}`);
});

lines.forEach(line => {
  console.log(`${chalk.keyword('orange')('Line:')} ${line.Text}`);
});



tables.forEach(table => {
  let header = [];

  const table_output = new Table({
    head: header,
    wordWrap: true
  });

  const cellIds = getRelationship(table, RelationshipTypes.CHILD);
  cellIds.forEach(cellId => {
    let cellText = [];
    const cell = cells.filter(cell => cell.Id === cellId)[0];
    const childIds = getRelationship(cell, RelationshipTypes.CHILD);
    childIds.forEach(childId => {
      const child = blocks.filter(block => block.Id === childId);
      cellText.push(child[0].Text);
    });
    if (cell.RowIndex === 1) {
      header.push(cellText.join(' '));
    } else {
      if (table_output[cell.RowIndex - 2] === undefined) {
        table_output.push([]);
      }

      table_output[cell.RowIndex - 2].push(chalk.yellow(cellText.join(' ')));
    }
  });

  console.log(table_output.toString());
});