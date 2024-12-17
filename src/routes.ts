// import { UserController } from "./controller/UserController"
import { MainController } from "./controller/MainController"

export const Routes = [
    {
        method: "get",
        route: "/validate-token",
        controller: MainController,
        action: "validateToken"
    }, 
    // user routes
    {
        method: "get",
        route: "/users",
        controller: MainController,
        action: "usersAll"
    }, 
    {
        method: "get",
        route: "/users/:id",
        controller: MainController,
        action: "usersOne"
    }, 
    {
        method: "post",
        route: "/users",
        controller: MainController,
        action: "usersCreate"
    }, 
    {
        method: "patch",
        route: "/users/:id",
        controller: MainController,
        action: "usersUpdate"
    }, 
    {
        method: "delete",
        route: "/users/:id",
        controller: MainController,
        action: "usersRemove"
    },
    {
        method: "post",
        route: "/auth/resetpass",
        controller: MainController,
        action: "usersAllowResetPass"
    },  
    {
        method: "post",
        route: "/auth/resetpass/:id",
        controller: MainController,
        action: "usersResetPassword"
    },  
    {
        method: "post",
        route: "/auth/login",
        controller: MainController,
        action: "usersAuthLogIn"
    },  
    {
        method: "post",
        route: "/auth/login/google",
        controller: MainController,
        action: "usersAuthLogInGoogle"
    },  
    {
        method: "post",
        route: "/auth/login/tokens",
        controller: MainController,
        action: "getGoogleTokens"
    }, 
    {
        method: "post",
        route: "/auth/signup",
        controller: MainController,
        action: "usersCreate"
    }, 
    {
        method: "get",
        route: "/activate/:id/:token",
        controller: MainController,
        action: "usersActivate"
    }, 
    {
        method: "get",
        route: "/activate/:id/:token/reset",
        controller: MainController,
        action: "usersResetActivate"
    }, 
    // role routes
    {
        method: "get",
        route: "/roles",
        controller: MainController,
        action: "rolesAll"
    }, 
    {
        method: "get",
        route: "/roles/:id",
        controller: MainController,
        action: "rolesOne"
    }, 
    {
        method: "post",
        route: "/roles",
        controller: MainController,
        action: "rolesCreate"
    }, 
    {
        method: "patch",
        route: "/roles/:id",
        controller: MainController,
        action: "rolesUpdate"
    }, 
    {
        method: "delete",
        route: "/roles/:id",
        controller: MainController,
        action: "rolesRemoveById"
    },
    // userHasRole
    {
        method: "get",
        route: "/usersandroles/",
        controller: MainController,
        action: "userHasRolesAll"
    },
    {
        method: "get",
        route: "/users/:id/roles/",
        controller: MainController,
        action: "userRoles"
    },
    {
        method: "get",
        route: "/users/:userId/roles/active",
        controller: MainController,
        action: "userActiveRoles"
    },
    {
        method: "post",
        route: "/users/:id/roles/",
        controller: MainController,
        action: "assignRoleByName"
    },
    {
        method: "delete",
        route: "/users/:id/roles/",
        controller: MainController,
        action: "cancelRoleByName"
    },
    {
        method: "patch",
        route: "/users/:id/roles/",
        controller: MainController,
        action: "userRolesUpdate"
    },
    // StoreProfile
    {
        method: "get",
        route: "/stores/",
        controller: MainController,
        action: "storesAll"
    },
    {
        method: "get",
        route: "/stores/byUserId/:id",
        controller: MainController,
        action: "storesOneByUserId"
    },
    {
        method: "get",
        route: "/stores/byId/:id",
        controller: MainController,
        action: "storesOne"
    },
    {
        method: "post",
        route: "/stores/",
        controller: MainController,
        action: "storesCreate"
    },
    {
        method: "patch",
        route: "/stores/byId/:id",
        controller: MainController,
        action: "storesUpdate"
    },
    {
        method: "delete",
        route: "/stores/:id",
        controller: MainController,
        action: "storesRemove"
    },
    // ExpertProfile
    {
        method: "get",
        route: "/experts/",
        controller: MainController,
        action: "expertsAll"
    },
    {
        method: "get",
        route: "/experts/byUserId/:id",
        controller: MainController,
        action: "expertsOneByUserId"
    },
    {
        method: "post",
        route: "/experts/",
        controller: MainController,
        action: "expertsCreate"
    },
    {
        method: "patch",
        route: "/experts/byId/:id",
        controller: MainController,
        action: "expertsUpdate"
    },
    {
        method: "delete",
        route: "/experts/:id",
        controller: MainController,
        action: "expertsRemove"
    },
    // Permission
    {
        method: "get",
        route: "/permissions",
        controller: MainController,
        action: "permissionsAll"
    }, 
    {
        method: "get",
        route: "/permissions/:id",
        controller: MainController,
        action: "permissionsOne"
    }, 
    {
        method: "post",
        route: "/permissions",
        controller: MainController,
        action: "permissionsCreate"
    }, 
    {
        method: "patch",
        route: "/permissions/:id",
        controller: MainController,
        action: "permissionsUpdate"
    }, 
    {
        method: "delete",
        route: "/permissions/:id",
        controller: MainController,
        action: "permissionsRemoveById"
    },
    // Role has permission
    {
        method: "get",
        route: "/rolesandpermissions/",
        controller: MainController,
        action: "roleHasPermissionsAll"
    },
    {
        method: "get",
        route: "/roles/:roleId/permissions/",
        controller: MainController,
        action: "rolePermissions"
    },
    {
        method: "post",
        route: "/roles/:roleId/permissions/",
        controller: MainController,
        action: "updateRolePermissions"
    },
    {
        method: "delete",
        route: "/roles/:roleId/permissions/",
        controller: MainController,
        action: "cancelPermissionByName"
    },
]