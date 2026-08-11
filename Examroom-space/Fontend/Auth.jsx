import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

const AuthCallback = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get("code")
    const state = params.get("state")
    console.log("code" , code)
    if (!code) {
      alert("ไม่มี code จาก SSO")
      navigate("/login")
      return
    }

    // 🔁 ส่ง code ไปแลก token ที่ backend
    fetch(localStorage.getItem("API") + `/callback?code=${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.message == "Login successful") {
          localStorage.setItem("token", data.token)
          localStorage.setItem('user', JSON.stringify(data.user));
          
          navigate("/Home")
        } else {
          alert("Login failed")
          navigate("/")
        }
      })
  }, [location.search])

  return <div>กำลังเข้าสู่ระบบ...</div>
}

export default AuthCallback
