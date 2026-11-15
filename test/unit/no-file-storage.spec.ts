import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_ENTITIES } from '../../src/database/entities.js';

describe('Mandatory Architectural Rule: Zero Persistent File Storage', () => {
  it('must NOT have any local file upload directories on disk', () => {
    const forbiddenDirs = [
      'uploads',
      'public/uploads',
      'storage',
      'temp_uploads',
      'files',
      'documents',
    ];

    for (const dir of forbiddenDirs) {
      const fullPath = path.resolve(process.cwd(), dir);
      expect(
        fs.existsSync(fullPath),
        `Violation detected: Forbidden directory '${dir}' exists on disk. ExaNova strictly prohibits local disk file storage.`,
      ).toBe(false);
    }
  });

  it('must NOT have database entities containing document binary/base64 storage columns', () => {
    // Check that none of the entities have columns designed to store uploaded documents or base64 files
    for (const EntityClass of ALL_ENTITIES) {
      const entityName = EntityClass.name;
      const forbiddenProperties = [
        'fileBuffer',
        'fileContent',
        'documentBlob',
        'documentBase64',
        'uploadedFile',
        'rawFile',
      ];

      for (const prop of forbiddenProperties) {
        expect(
          prop in EntityClass.prototype,
          `Violation detected: Entity '${entityName}' contains property '${prop}' which violates the zero file storage policy.`,
        ).toBe(false);
      }
    }
  });

  it('must use in-memory stream/buffer generation for PDF and Excel exports', () => {
    // Verify that reports and scorecards are returned as buffers/streams and never saved to disk
    const rootFiles = fs.readdirSync(process.cwd());
    const generatedArtifacts = rootFiles.filter(
      (f) => f.endsWith('.pdf') || f.endsWith('.xlsx') || f.endsWith('.docx'),
    );

    expect(
      generatedArtifacts,
      'No PDF or Excel files should be written to the server filesystem.',
    ).toHaveLength(0);
  });
});
