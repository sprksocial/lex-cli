# Lexicon CLI Tool

Command-line tool to generate Lexicon schemas and APIs.

## Usage

```
Usage: deno run mod.ts [options] [command]

Lexicon CLI

Options:
  -V, --version                     output the version number
  -h, --help                        display help for command

Commands:
  gen-md <outfile> <lexicons...>    Generate markdown documentation
  gen-ts-obj <lexicons...>          Generate a TS file that exports an array of lexicons
  gen-api <outdir> <lexicons...>    Generate a TS client API
  gen-server <outdir> <lexicons...> Generate a Hono server API
  help [command]                    display help for command
```

**Example 1:** Generate markdown documentation

```
$ deno run mod.ts gen-md ./docs/api.md ./schemas/com/service/*.json
```

**Example 2:** Generate a client API

```
$ deno run mod.ts gen-api ./api/src ./schemas/com/service/*.json ./schemas/com/another/*.json
```

**Example 3:** Generate a server API

```
$ deno run mod.ts gen-server ./server/src ./schemas/com/service/*.json ./schemas/com/another/*.json
```

## Development

To run with all permissions:

```
$ deno run -A mod.ts [command]
```

## License

This project is licensed under MIT