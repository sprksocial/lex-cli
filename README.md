[![JSR](https://jsr.io/badges/@sprk/lex-cli)](https://jsr.io/@sprk/lex-cli)

# Lexicon CLI Tool

Command-line tool to generate Lexicon schemas and APIs.

## Usage

```
Usage: deno run jsr:@sprk/lex-cli [options] [command]

Lexicon CLI

Options:
  -V, --version                     output the version number
  -h, --help                        display help for command

Commands:
  gen-md <outfile> <lexicons...>    Generate markdown documentation
    Options:
      --yes                         skip confirmation

  gen-ts-obj <lexicons...>          Generate a TS file that exports an array of lexicons

  gen-api <outdir> <lexicons...>    Generate a TS client API
    Options:
      --yes                         skip confirmation
      --js                          use .js extension for imports instead of .ts

  gen-server <outdir> <lexicons...> Generate a Hono server API
    Options:
      --yes                         skip confirmation
      --js                          use .js extension for imports instead of .ts
      --hono-import <path>          specify import path for Hono (defaults to "@hono/hono")

  help [command]                    display help for command
```

**Example 1:** Generate markdown documentation

```
$ deno run jsr:@sprk/lex-cli gen-md ./docs/api.md ./schemas/com/service/*.json
```

You can also specify directories, which will be searched recursively for .json
files:

```
$ deno run jsr:@sprk/lex-cli gen-md ./docs/api.md ./schemas/com/service
```

**Example 2:** Generate a client API

```
$ deno run jsr:@sprk/lex-cli gen-api ./api/src ./schemas/com/service/*.json ./schemas/com/another/*.json
```

Or using directory paths:

```
$ deno run jsr:@sprk/lex-cli gen-api ./api/src ./schemas/com
```

**Example 3:** Generate a server API

```
$ deno run jsr:@sprk/lex-cli gen-server ./server/src ./schemas/com/service/*.json ./schemas/com/another/*.json
```

Or using directory paths:

```
$ deno run jsr:@sprk/lex-cli gen-server ./server/src ./schemas/com
```

## Development

To run with all permissions:

```
$ deno run -A jsr:@sprk/lex-cli [command]
```

## License

This project is licensed under MIT
