import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/cliente-s3';
import { Readable } from 'stream';
import sharp from 'sharp';
import { STATUS_CODES } from 'http';

const client = new S3Client({ region: "us-east-1" });

export const handler = async (event) => {
    try {
        await resizeEachFile(event)
    } catch (error) {
        return {
            statusCode: 500,
            body: error.message,
        };
    }
    
    return {
        statusCode: 200,
        body: 'Imagem redimensaionada com sucesso!'
    };
};

async function resizeEachFile(event) {
    if (event?.Records && event.Records.length > 0) {
        for (const record of event.Records) {
            const bucketName = record.s3.bucket.name;
            const objectKey = record.s3.object.key;

            try {
                let originObject = getObject(bucketName, objectKey);
                var stream = originObject.Body;
                if (stream instanceof Readable) {
                    var content_buffer = Buffer.concat(await stream.toArray());
                    const width = 200;
                    var output_buffer = await sharp(content_buffer).resize(width).toBuffer();
                    await PutObjectCommand('thumbnails-outout-file', objectKey);
                } else {
                    throw new Error('Objeto desconhecido...');
                }
            } catch (e) {
                throw new Error('Erro ao processar objeto do Bucket');
            }
        }
    }
}

async function getObject(bucketName, objectKey) {
    const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey
    });
    try {
        const response = await client.send(getCommand);
        return response;
    } catch (error) {
        throw new Error('Erro ao processar objeto do Bucket');
    }
}

async function putObject(dstBucket, dstKey, content) {
    try {

        try {
            // Verificar se o nome do arquivo contém caracteres inválidos
            if (/[/\\:*?"<>|]/.test(dstKey)) {
                throw new Error('O nome do arquivo contém caracteres inválidos');
            }

            const putCommand = new PutObjectCommand({
                Bucket: dstBucket,
                Key: dstKey,
                Body: content,
                ContentType: "image"
            });
            const putResult = await client.send(putCommand);
            return putResult;
        } catch (error) {
            console.error('Erro ao fazer upload do arquivo para o Amazon S3:', error.message);
            return;
        }
    }
}