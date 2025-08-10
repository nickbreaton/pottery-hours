import { ParseResult, Schema } from 'effect';

export const FileFromSelf = Schema.declare((input: unknown): input is File => {
	return input instanceof File;
});

export const PdfFile = FileFromSelf.pipe(Schema.filter((file) => file.type === 'application/pdf'));

export type PdfFile = typeof PdfFile.Type;
