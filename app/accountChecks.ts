const symbolRegex = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

export const checkPassword = (password: string) => {
    if(password.length < 6){
        return {
            success: false,
            message: "Password must be at least 6 characters long"
        }
    }

    if(password.includes(" ")){
        return {
            success: false,
            message: "Password cannot contain spaces"
        }
    }

    return {
        success: true,
        message: ""
    }
}

export const checkUsername = (username: string) => {
    if(username.length < 3){
        return {
            success: false,
            message: "Username must be at least 3 characters long"
        }
    }

    if(username.includes(" ")){
        return {
            success: false,
            message: "Username cannot contain spaces"
        }
    }

    if(symbolRegex.test(username)){
        return {
            success: false,
            message: "Username cannot contain symbols"
        }
    }

    return {
        success: true,
        message: ""
    }
}
