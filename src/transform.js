import j from 'jscodeshift'
import _ from 'lodash'
import prettier from 'prettier'

const DEFAULT = 'default'
const REQUIRE = 'require'

function createImports(files) {
  const { imports, aliases } = Object.keys(files)
    .map((name) => {
      const imports = files[name]
      const others = []
      const namedAliases = []
      // Get all the named imports
      const named = Object.keys(imports)
        .map((name) => {
          if (name === DEFAULT) return null
          imports[name].aliases.forEach((alias) => {
            namedAliases.push({ name, alias })
          })
          return name
        })
        .filter(Boolean)

      // If we don't have a default then we'll import using destructuring
      if (!imports.default) {
        namedAliases.forEach(({ name, alias }) => {
          others.push(`const ${alias} = ${name}`)
        })

        return {
          import: `const { ${named.join(', ')} } = '${name}'`,
          aliases: others,
        }
      }

      // Get the first default export and alias the rest of them
      const first = _.first(imports.default.aliases)
      _.takeRight(
        imports.default.aliases,
        imports.default.aliases.length - 1,
      ).forEach((other) => others.push(`const ${other} = ${first}`))
      namedAliases.forEach(({ name, alias }) => {
        others.push(`const ${alias} = ${first}.${name}`)
      })
      named.forEach((alias) =>
        others.push(`const ${alias} = ${first}.${alias}`),
      )

      return {
        import: `const ${first} = '${name}'`,
        aliases: others,
      }
    })
    .reduce(
      (accum, item) => {
        return {
          imports: [...accum.imports, item.import],
          aliases: [...accum.aliases, ...item.aliases],
        }
      },
      { imports: [], aliases: [] },
    )

  // Output the constructed require statements
  return aliases.length
    ? `${imports.join('\n')}

${aliases.join('\n')}`
    : imports.join('\n')
}

export function transform(file) {
  const items = {}

  function ensurePath(name, key) {
    if (!items[name]) {
      items[name] = {}
    }
    if (!items[name][key]) {
      items[name][key] = { value: key, aliases: [] }
    }
  }

  function addDefaultAlias(name, alias) {
    ensurePath(name, DEFAULT)
    items[name][DEFAULT].aliases.push(alias)
  }

  let transform = j(file)
    .find(j.VariableDeclaration)
    .forEach((path) => {
      if (path.node.declarations[0]?.init?.callee?.name !== REQUIRE) return
      const name = path.node.declarations[0].init.arguments[0].value
      if (path.node.declarations[0].id.properties) {
        path.node.declarations[0].id.properties.map((property) => {
          const key = property.key.name
          ensurePath(name, key)
          if (key !== property.value.name) {
            items[name][key].aliases.push(property.value.name)
          }
        })
      } else {
        addDefaultAlias(name, path.node.declarations[0].id.name)
      }
      j(path).remove()
    })

  transform = j(transform.toSource())
    .find(j.ImportDeclaration)
    .forEach((path) => {
      const name = path.value.source.value
      path.value.specifiers.forEach((specifier) => {
        switch (specifier.type) {
          case 'ImportNamespaceSpecifier':
          case 'ImportDefaultSpecifier':
            addDefaultAlias(name, specifier.local.name)
            break
          case 'ImportSpecifier':
            ensurePath(name, specifier.local.name)
            break
        }
      })
      j(path).remove()
    })

  const imports = createImports(items)

  return prettier.format(
    `${imports}

${transform.toSource()}`,
    {
      useTabs: false,
      arrowParens: 'always',
      tabWidth: 2,
      singleQuote: true,
      trailingComma: 'all',
      jsxBracketSameLine: false,
      semi: false,
    },
  )
}
