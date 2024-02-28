import {
  AddPermissionOrigin,
  EnableAccessMsg,
  GetOriginPermittedChainsMsg,
  GetPermissionOriginsMsg,
  RemovePermissionOrigin,
} from "./messages";
import { Env, Handler, InternalHandler, Message } from "@owallet/router";
import { PermissionService } from "./service";

export const getHandler: (service: PermissionService) => Handler = (
  service
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case EnableAccessMsg:
        return handleEnableAccessMsg(service)(env, msg as EnableAccessMsg);
      case GetPermissionOriginsMsg:
        return handleGetPermissionOriginsMsg(service)(
          env,
          msg as GetPermissionOriginsMsg
        );
      case GetOriginPermittedChainsMsg:
        return handleGetOriginPermittedChainsMsg(service)(
          env,
          msg as GetOriginPermittedChainsMsg
        );
      case AddPermissionOrigin:
        return handleAddPermissionOrigin(service)(
          env,
          msg as RemovePermissionOrigin
        );
      case RemovePermissionOrigin:
        return handleRemovePermissionOrigin(service)(
          env,
          msg as RemovePermissionOrigin
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleEnableAccessMsg: (
  service: PermissionService
) => InternalHandler<EnableAccessMsg> = (service) => {
  return (env, msg) => {
    return service.checkOrGrantBasicAccessPermission(
      env,
      msg.chainIds,
      msg.origin
    );
  };
};

const handleGetPermissionOriginsMsg: (
  service: PermissionService
) => InternalHandler<GetPermissionOriginsMsg> = (service) => {
  return (_, msg) => {
    return service.getPermissionOrigins(msg.chainId, msg.permissionType);
  };
};

const handleGetOriginPermittedChainsMsg: (
  service: PermissionService
) => InternalHandler<GetOriginPermittedChainsMsg> = (service) => {
  return (_, msg) => {
    return service.getOriginPermittedChains(
      msg.permissionOrigin,
      msg.permissionType
    );
  };
};

const handleAddPermissionOrigin: (
  service: PermissionService
) => InternalHandler<AddPermissionOrigin> = (service) => {
  return (_, msg) => {
    service.addPermission([msg.chainId], msg.permissionType, [
      msg.permissionOrigin,
    ]);
  };
};

const handleRemovePermissionOrigin: (
  service: PermissionService
) => InternalHandler<RemovePermissionOrigin> = (service) => {
  return (_, msg) => {
    service.removePermission(msg.chainId, msg.permissionType, [
      msg.permissionOrigin,
    ]);
  };
};
