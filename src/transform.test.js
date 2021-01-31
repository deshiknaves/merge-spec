import { transform } from './transform'

describe(transform.name, () => {
  it('should be able to transform a named require', () => {
    const source = `const { foo, car } = require('./utils')

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const { foo, car } = './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform an aliased named require', () => {
    const source = `const { foo: test, car } = require('./utils')

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const { foo, car } = './utils'

      const test = foo

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform a default require', () => {
    const source = `const foo = require('./utils')

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const foo = './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform a namespace import', () => {
    const source = `import * as far from './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const far = './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform a default import', () => {
    const source = `import foo from './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const foo = './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform named imports', () => {
    const source = `import { foo, bar } from './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const { foo, bar } = './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform named and default imports', () => {
    const source = `import foo, { car, bar } from './utils'

      describe('Compose Message', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const foo = './utils'

      const car = foo.car
      const bar = foo.bar

      describe('Compose Message', () => {
        console.log(foo)
      })
      "
    `)
  })

  it('should be able to transform everything combined', () => {
    const source = `import * as far from './utils'
      import rar, { tar, sar } from './utils'
      const { foo: test, car } = require('./utils')

      const name = 'foo'

      describe('Compose Message', () => {
        console.log(foo)
      })
      const { bar } = require('./utils')


      describe('Impersonation', () => {
        console.log(bar)
      })
      const shoo = require('./utils')


      describe('Compose Messages', () => {
        console.log(foo)
      })`

    expect(transform(source)).toMatchInlineSnapshot(`
      "const shoo = './utils'

      const far = shoo
      const rar = shoo
      const test = shoo.foo
      const foo = shoo.foo
      const car = shoo.car
      const bar = shoo.bar
      const tar = shoo.tar
      const sar = shoo.sar

      const name = 'foo'

      describe('Compose Message', () => {
        console.log(foo)
      })

      describe('Impersonation', () => {
        console.log(bar)
      })

      describe('Compose Messages', () => {
        console.log(foo)
      })
      "
    `)
  })
})
