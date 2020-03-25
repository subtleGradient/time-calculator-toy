import dayjs from "dayjs"
import calendar from "dayjs/plugin/calendar"
import relativeTime from "dayjs/plugin/relativeTime"
import React from "react"
import createPersistedState from "use-persisted-state"
import XRegExp from "xregexp"
import "./styles.css"

dayjs.extend(calendar)
dayjs.extend(relativeTime)

;(window as any)["dayjs"] = dayjs
;(window as any)["XRegExp"] = XRegExp

const useCodeState = createPersistedState("code")
const useExpressionState = createPersistedState("expression")

// https://regexr.com/4vuv4
const regexpMath = XRegExp(
  "(?<math>[+-])\\s*(?<mathValue>\\d+)(?<mathUnit>ms|[smhdw]|mo|y)\\b",
  "xgi",
)
;(window as any)["regexpMath"] = regexpMath

// https://regexr.com/4vv9q
const regexpTime = XRegExp(
  "\\b(?<hour>\\d+)(?::(?<minute>\\d+))?(?<ampm>[ap]m)\\b|\\b(?<hour24>\\d+):(?<minute24>\\d+)\\b",
  "xgi",
)
;(window as any)["regexpTime"] = regexpTime

export default function App() {
  const [expression, setExpression] = useExpressionState(
    `meeting starts at 4pm,
    but I want to get there -30m early,
    but it takes -16m to drive there
    and I need -45m to get ready.
    
    So, when should I eat -1h lunch?`,
  )
  const [code, setCode] = useCodeState("")
  const [result, setResult] = React.useState<dayjs.Dayjs | void>()
  const [error, setError] = React.useState<Error | void>()

  React.useEffect(() => {
    const start = `Date.now()`
    let newTimeCode = ""
    const maths: string[] = []

    XRegExp.forEach(
      expression,
      regexpTime,
      ({ hour, ampm, hour24, minute, minute24 }: any) => {
        const theHour = hour24 || parseFloat(hour) + (ampm === "pm" ? 12 : 0)
        const minutesPastTheHour = minute24 || parseFloat(minute) || 0

        newTimeCode += `.hour(${theHour})`
        newTimeCode += `.minute(${minutesPastTheHour})`
      },
    )

    XRegExp.forEach(expression, regexpMath, ({ math, mathUnit, mathValue }) => {
      const method = { "-": "subtract", "+": "add" }[math as "-" | "+"]
      maths.push(
        `.${method}(${parseFloat(mathValue)}, ${JSON.stringify(mathUnit)})`,
      )
    })

    const innerCode = `dayjs(${start})${newTimeCode}${maths.join("")}`
    setCode(() => innerCode)
  }, [expression])

  React.useEffect(() => {
    if (typeof code !== "string") {
      return
    }
    setError()
    try {
      const funk = new Function("dayjs", `return (${code})`)
      const newResult = funk(dayjs)
      if (dayjs.isDayjs(newResult)) {
        setResult(() => newResult)
      } else {
        throw new Error("unexpected result")
      }
    } catch (e) {
      setError(e)
      setResult()
    }
  }, [code])

  return (
    <div className="App" style={{ display: "flex", flexDirection: "column" }}>
      <h1>Time Calculator (toy)</h1>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "stretch",
        }}
      >
        {result != null && (
          <>
            <b>{result.fromNow()}</b>
            <i>
              {result.calendar(dayjs(), {
                sameDay: "[Today at] h:mm A", // The same day ( Today at 2:30 AM )
                nextDay: "[Tomorrow] h:mm A", // The next day ( Tomorrow at 2:30 AM )
                nextWeek: "dddd h:mm A", // The next week ( Sunday at 2:30 AM )
                lastDay: "[Yesterday] h:mm A", // The day before ( Yesterday at 2:30 AM )
                lastWeek: "[Last] dddd h:mm A", // Last week ( Last Monday at 2:30 AM )
                sameElse: "dddd M/D/YYYY h:mm A", // Everything else ( 7/10/2011 )
              })}
            </i>
            <span>{JSON.stringify(result)}</span>
          </>
        )}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "stretch",
          alignItems: "stretch",
        }}
      >
        <textarea
          // autoFocus
          value={expression}
          onChange={e => setExpression(e.target.value)}
          style={{ flex: 1, minHeight: 130 }}
        />
        <textarea
          value={"" + code}
          onChange={e => setCode(e.target.value)}
          style={{ flex: 1, minHeight: 130 }}
        />
      </div>
      {error && (
        <div>
          <b>{error.toString()}</b>
        </div>
      )}
    </div>
  )
}
