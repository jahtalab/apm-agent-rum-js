/**
 * MIT License
 *
 * Copyright (c) 2017-present, Elasticsearch BV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

const { allowSomeBrowserErrors } = require('../../../../../dev-utils/webdriver')

describe('react app', function() {
  it('should run the react app', function() {
    browser.url('/test/e2e/react/')
    browser.waitUntil(
      () => {
        return $('#test-element').getText() === 'Passed'
      },
      5000,
      'expected element #test-element'
    )

    const serverCalls = browser.executeAsync(function(done) {
      var apmServerMock = window.elasticApm.serviceFactory.getService(
        'ApmServer'
      )

      function checkCalls() {
        var serverCalls = apmServerMock.calls
        var validCalls =
          serverCalls.sendTransactions &&
          serverCalls.sendTransactions.length >= 1

        if (validCalls) {
          Promise.all([serverCalls.sendTransactions[0].returnValue])
            .then(function() {
              function mapCall(c) {
                return { args: c.args, mocked: c.mocked }
              }
              try {
                var calls = {
                  sendTransactions: serverCalls.sendTransactions.map(mapCall)
                }
                done(calls)
              } catch (e) {
                throw e
              }
            })
            .catch(function(reason) {
              console.log('reason', reason)
              try {
                done({ error: reason.message || JSON.stringify(reason) })
              } catch (e) {
                done({
                  error: 'Failed serializing rejection reason: ' + e.message
                })
              }
            })
        }
      }

      checkCalls()
      apmServerMock.subscription.subscribe(checkCalls)
    })

    expect(serverCalls).toBeTruthy()
    console.log(JSON.stringify(serverCalls, null, 2))
    if (serverCalls.error) {
      fail(serverCalls.error)
    }

    expect(serverCalls.sendTransactions.length).toBe(1)

    var routeChangeTransaction = serverCalls.sendTransactions[0].args[0][0]
    expect(routeChangeTransaction.type).toBe('route-change')
    expect(routeChangeTransaction.name).toBe('/')
    expect(routeChangeTransaction.spans.length).toBeGreaterThan(1)

    var fetchDataSpan = routeChangeTransaction.spans.find(function(s) {
      return s.name === 'GET /test/e2e/react/data.json'
    })
    expect(fetchDataSpan).toBeDefined()

    return allowSomeBrowserErrors()
  })
})