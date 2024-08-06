// import { UserController } from "./controller/UserController"
import { MainController } from "./controller/MainController"

export const Routes = [
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
        method: "post",
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
        method: "post",
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
        route: "/users/:userId/roles/",
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
        route: "/users/:userId/roles/",
        controller: MainController,
        action: "assignRoleByName"
    },
    {
        method: "delete",
        route: "/users/:userId/roles/",
        controller: MainController,
        action: "cancelRoleByName"
    },
    // StoreProfile
    {
        method: "get",
        route: "/stores/",
        controller: MainController,
        action: "storesAll"
    },
    {
        method: "post",
        route: "/stores/",
        controller: MainController,
        action: "storesCreate"
    },
    {
        method: "post",
        route: "/stores/:id",
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
        method: "post",
        route: "/experts/",
        controller: MainController,
        action: "expertsCreate"
    },
    {
        method: "post",
        route: "/experts/:id",
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
        method: "post",
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
        action: "assignPermissionByName"
    },
    {
        method: "delete",
        route: "/roles/:roleId/permissions/",
        controller: MainController,
        action: "cancelPermissionByName"
    },
]