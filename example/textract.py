# Analyzes text in a document stored in an S3 bucket. Display polygon box around text and angled text
# https://docs.aws.amazon.com/textract/latest/dg/analyzing-document-text.html
import boto3
import io
from io import BytesIO
import sys
import os

import math
from PIL import Image, ImageDraw, ImageFont


def DrawBoundingBox(draw, box, width, height, boxColor):

    left = width * box['Left']
    top = height * box['Top']
    draw.rectangle([left, top, left + (width * box['Width']),
                    top + (height * box['Height'])], outline=boxColor)

# Displays information about a block returned by text detection and text analysis
def DisplayBlockInformation(block):
    print('Id: {}'.format(block['Id']))
    if 'Detected' in block:
        print('    Detected: ' + block['Text'])
    print('    Type: ' + block['BlockType'])

    if 'Confidence' in block:
        print('    Confidence: ' + "{:.2f}".format(block['Confidence']) + "%")

    if block['BlockType'] == 'CELL':
        print("    Cell information")
        print("        Column:" + str(block['ColumnIndex']))
        print("        Row:" + str(block['RowIndex']))
        print("        Column Span:" + str(block['ColumnSpan']))
        print("        RowSpan:" + str(block['ColumnSpan']))

    if 'Relationships' in block:
        print('    Relationships: {}'.format(block['Relationships']))
    print('    Geometry: ')
    print('        Bounding Box: {}'.format(block['Geometry']['BoundingBox']))
    print('        Polygon: {}'.format(block['Geometry']['Polygon']))

    if block['BlockType'] == "KEY_VALUE_SET":
        print ('    Entity Type: ' + block['EntityTypes'][0])
    if 'Page' in block:
        print('Page: ' + block['Page'])
    print()


if __name__ == "__main__":

    # bucket = "YOUR_BUCKET"
    # document = "YOUR_DOCUMENT"

    # Get the document from S3
    # s3_connection = boto3.resource('s3')

    # s3_object = s3_connection.Object(bucket, document)
    # s3_response = s3_object.get()

    # stream = io.BytesIO(s3_response['Body'].read())

    with open('input/example-1.jpg') as file:
        img_test = file.read()
        # document = file.name
        document = os.path.basename(file.name)
        bytes_test = bytearray(img_test)
        stream = io.BytesIO(bytes_test)

    image = Image.open(stream).convert('RGB')

    # Analyze the document
    client = boto3.client('textract')

    # image_binary = stream.getvalue()
    response = client.analyze_document(Document={'Bytes': bytes_test},
                                       FeatureTypes=["TABLES", "FORMS"])
    # print(response)
    # Alternatively, process using S3 object
    # response = client.analyze_document(
    #     Document={'S3Object': {'Bucket': bucket, 'Name': document}},
    #     FeatureTypes=["TABLES", "FORMS"])

    # Get the text blocks
    blocks = response['Blocks']
    width, height = image.size
    draw = ImageDraw.Draw(image, mode='RGB')
    print ('Detected Document Text')

    # Create image showing bounding box/polygon the detected lines/text
    for block in blocks:

        # DisplayBlockInformation(block)
        draw = ImageDraw.Draw(image, mode='RGB')
        if block['BlockType'] == "KEY_VALUE_SET":
            if block['EntityTypes'][0] == "KEY":
                DrawBoundingBox(
                    draw, block['Geometry']['BoundingBox'], width, height, 'red')
            else:
                DrawBoundingBox(
                    draw, block['Geometry']['BoundingBox'], width, height, 'green')

        if block['BlockType'] == 'TABLE':
            DrawBoundingBox(draw, block['Geometry']
                            ['BoundingBox'], width, height, 'blue')

        if block['BlockType'] == 'CELL':
            DrawBoundingBox(draw, block['Geometry']
                            ['BoundingBox'], width, height, 'yellow')

        if block['BlockType'] == 'LINE':
            DrawBoundingBox(draw, block['Geometry']
                            ['BoundingBox'], width, height, 'black')

    # uncomment to draw polygon for all Blocks
    # points=[]
    # for polygon in block['Geometry']['Polygon']:
    #    points.append((width * polygon['X'], height * polygon['Y']))
    #draw.polygon((points), outline='blue')

    # Display the image
    image.save("output/"+document + "-output.jpg")
