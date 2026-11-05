import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET as GET_ONE } from "@/app/api/cv/[cvId]/route";
import { GET, POST } from "@/app/api/cv/route";
import { CV_MIME } from "@/lib/cv/extract";
import { prisma } from "@/lib/prisma";
import {
  FICTIONAL_CV_TEXT,
  fictionalCvFile,
  pdfMagicBytes,
} from "../fixtures/cv";
import { createTestUser, readJson, routeParams, signInAs } from "../setup/auth";
import { resetDatabase } from "../setup/db";

vi.mock("@/lib/cv/extract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cv/extract")>();
  return {
    ...actual,
    extractCvText: vi.fn(async () => ({
      text: FICTIONAL_CV_TEXT,
      truncated: false,
      pageCount: 1,
    })),
  };
});

function multipartCv(file: File): Request {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://localhost/api/cv", { method: "POST", body: form });
}

describe("API /api/cv", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET/POST responden 401 sin sesión", async () => {
    expect((await GET()).status).toBe(401);
    expect(
      (
        await POST(
          multipartCv(fictionalCvFile("cv.pdf", pdfMagicBytes(), CV_MIME.pdf)),
        )
      ).status,
    ).toBe(401);
  });

  it("POST 400 si falta el archivo", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const form = new FormData();
    const response = await POST(
      new Request("http://localhost/api/cv", { method: "POST", body: form }),
    );
    expect(response.status).toBe(400);
  });

  it("POST 415 si la extensión no es PDF/DOCX", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await POST(
      multipartCv(fictionalCvFile("cv.txt", pdfMagicBytes(), "text/plain")),
    );
    expect(response.status).toBe(415);
  });

  it("POST 413 si Content-Length declara un archivo enorme", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await POST(
      new Request("http://localhost/api/cv", {
        method: "POST",
        headers: { "content-length": String(10 * 1024 * 1024) },
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(413);
  });

  it("POST 201 persiste el CV ficticio y GET lo lista", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const created = await POST(
      multipartCv(
        fictionalCvFile("cv.pdf", pdfMagicBytes("body"), CV_MIME.pdf),
      ),
    );
    expect(created.status).toBe(201);
    const body = await readJson<{
      cv: { id: string; fileName: string; extractedText: string };
      storageWarning: string | null;
    }>(created);
    expect(body.cv.fileName).toBe("cv.pdf");
    expect(body.cv.extractedText).toBe(FICTIONAL_CV_TEXT);
    expect(body.storageWarning).toBeTruthy();

    const list = await GET();
    expect(list.status).toBe(200);
    const listed = await readJson<{ cvs: { id: string }[] }>(list);
    expect(listed.cvs[0]?.id).toBe(body.cv.id);
  });

  it("GET/DELETE de otro usuario responden 404", async () => {
    const owner = await createTestUser({ prefix: "owner" });
    const cv = await prisma.candidateCv.create({
      data: {
        userId: owner.id,
        fileName: "cv.pdf",
        mimeType: CV_MIME.pdf,
        sizeBytes: 100,
        extractedText: FICTIONAL_CV_TEXT,
      },
    });
    const other = await createTestUser({ prefix: "other" });
    await signInAs(other);
    const got = await GET_ONE(
      new Request(`http://localhost/api/cv/${cv.id}`),
      routeParams({ cvId: cv.id }),
    );
    expect(got.status).toBe(404);
    const deleted = await DELETE(
      new Request(`http://localhost/api/cv/${cv.id}`),
      routeParams({ cvId: cv.id }),
    );
    expect(deleted.status).toBe(404);
  });

  it("el dueño obtiene y borra su CV", async () => {
    const owner = await createTestUser();
    await signInAs(owner);
    const cv = await prisma.candidateCv.create({
      data: {
        userId: owner.id,
        fileName: "cv.pdf",
        mimeType: CV_MIME.pdf,
        sizeBytes: 100,
        extractedText: FICTIONAL_CV_TEXT,
      },
    });
    const got = await GET_ONE(
      new Request(`http://localhost/api/cv/${cv.id}`),
      routeParams({ cvId: cv.id }),
    );
    expect(got.status).toBe(200);
    const deleted = await DELETE(
      new Request(`http://localhost/api/cv/${cv.id}`),
      routeParams({ cvId: cv.id }),
    );
    expect(deleted.status).toBe(200);
    expect(await prisma.candidateCv.findUnique({ where: { id: cv.id } })).toBe(
      null,
    );
  });
});
