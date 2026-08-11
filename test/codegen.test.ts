import { describe, it, expect } from "vitest";
import { generateTypes, validateMcpTool, validateManifest } from "../src/codegen.js";
import type { McpTool } from "../src/types.js";

const tools: McpTool[] = [
  { name:"search_docs", description:"Search documents", inputSchema:{ type:"object", properties:{ query:{ type:"string",description:"Search query" }, limit:{ type:"number",description:"Max results" } }, required:["query"] } },
  { name:"get_status", description:"Get server status", inputSchema:{ type:"object", properties:{ verbose:{ type:"boolean" } } } },
];

describe("generateTypes",()=>{
  it("generates 2 files",()=>{
    const files=generateTypes(tools,"my-server");
    expect(files).toHaveLength(2);
    expect(files[0].path).toContain(".types.ts");
    expect(files[1].path).toContain(".functions.ts");
  });

  it("generates PascalCase interfaces",()=>{
    const files=generateTypes(tools,"srv");
    expect(files[0].content).toContain("SearchDocsArgs");
    expect(files[1].content).toContain("SearchDocsFn");
  });

  it("required fields are not optional",()=>{
    const files=generateTypes(tools,"srv");
    expect(files[0].content).toContain("query: string");  // required, no ?
  });

  it("optional fields have ?",()=>{
    const files=generateTypes(tools,"srv");
    expect(files[0].content).toMatch(/limit\?: number/);
  });

  it("tool without inputSchema is skipped",()=>{
    const files=generateTypes([{ name:"noop" }],"srv");
    expect(files[0].content).not.toContain("NoopArgs");
  });

  it("enum types generate union",()=>{
    const files=generateTypes([{ name:"set_mode", inputSchema:{ type:"object", properties:{ mode:{ type:"string",enum:["auto","manual"] } } } }],"srv");
    expect(files[0].content).toContain('"auto" | "manual"');
  });

  it("generates server name in header",()=>{
    expect(generateTypes(tools,"my-srv")[0].content).toContain("my-srv");
  });
});

describe("validateMcpTool",()=>{
  it("accepts valid tool",()=>{
    const r = validateMcpTool(tools[0]);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects empty name",()=>{
    expect(validateMcpTool({ name: "" }).valid).toBe(false);
  });

  it("rejects invalid name characters",()=>{
    const r = validateMcpTool({ name: "bad name!" });
    expect(r.errors[0]).toContain("invalid characters");
  });

  it("flags required field not in properties",()=>{
    const r = validateMcpTool({ name: "x", inputSchema: { type: "object", properties: {}, required: ["query"] } });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("'query'");
  });

  it("warns when inputSchema missing",()=>{
    const r = validateMcpTool({ name: "noop" });
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("validateManifest aggregates counts",()=>{
    const r = validateManifest({ tools: [tools[0], { name: "" }] });
    expect(r.results).toHaveLength(2);
    expect(r.validCount).toBe(1);
  });
});
