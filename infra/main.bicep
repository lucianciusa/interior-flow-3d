targetScope = 'resourceGroup'

@description('Region for all resources.')
param location string = resourceGroup().location

@description('Container App name.')
param acaName string

@description('Key Vault name. Globally unique, 3-24 alphanumerics.')
param kvName string

@description('Optional initial container image.')
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Storage account name for catalog GLBs (3-24 lowercase alphanumerics).')
param storageName string

@description('Front Door profile name.')
param frontDoorProfile string

@description('Front Door endpoint name.')
param frontDoorEndpoint string

module containerApp 'containerapp.bicep' = {
  name: 'containerApp'
  params: {
    location: location
    acaName: acaName
    image: image
  }
}

module keyVault 'keyvault.bicep' = {
  name: 'keyVault'
  params: {
    location: location
    kvName: kvName
    principalId: containerApp.outputs.acaPrincipalId
  }
}

module storage 'storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    storageName: storageName
  }
}

module frontDoor 'frontdoor.bicep' = {
  name: 'frontdoor'
  params: {
    profileName: frontDoorProfile
    endpointName: frontDoorEndpoint
    originHost: storage.outputs.blobHost
  }
}

output acaFqdn string = containerApp.outputs.acaFqdn
output kvUri string = keyVault.outputs.kvUri
output cdnHostName string = frontDoor.outputs.endpointHostName
output blobHost string = storage.outputs.blobHost
