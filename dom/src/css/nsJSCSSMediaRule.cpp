/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.  All Rights
 * Reserved.
 */
/* AUTO-GENERATED. DO NOT EDIT!!! */

#include "jsapi.h"
#include "nscore.h"
#include "nsIScriptContext.h"
#include "nsIJSScriptObject.h"
#include "nsIScriptObjectOwner.h"
#include "nsIScriptGlobalObject.h"
#include "nsIPtr.h"
#include "nsString.h"
#include "nsIDOMCSSStyleRuleCollection.h"
#include "nsIDOMCSSMediaRule.h"


static NS_DEFINE_IID(kIScriptObjectOwnerIID, NS_ISCRIPTOBJECTOWNER_IID);
static NS_DEFINE_IID(kIJSScriptObjectIID, NS_IJSSCRIPTOBJECT_IID);
static NS_DEFINE_IID(kIScriptGlobalObjectIID, NS_ISCRIPTGLOBALOBJECT_IID);
static NS_DEFINE_IID(kICSSStyleRuleCollectionIID, NS_IDOMCSSSTYLERULECOLLECTION_IID);
static NS_DEFINE_IID(kICSSMediaRuleIID, NS_IDOMCSSMEDIARULE_IID);

NS_DEF_PTR(nsIDOMCSSStyleRuleCollection);
NS_DEF_PTR(nsIDOMCSSMediaRule);

//
// CSSMediaRule property ids
//
enum CSSMediaRule_slots {
  CSSMEDIARULE_MEDIATYPES = -1,
  CSSMEDIARULE_RULES = -2
};

/***********************************************************************/
//
// CSSMediaRule Properties Getter
//
PR_STATIC_CALLBACK(JSBool)
GetCSSMediaRuleProperty(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
  nsIDOMCSSMediaRule *a = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);

  // If there's no private data, this must be the prototype, so ignore
  if (nsnull == a) {
    return JS_TRUE;
  }

  if (JSVAL_IS_INT(id)) {
    switch(JSVAL_TO_INT(id)) {
      case CSSMEDIARULE_MEDIATYPES:
      {
        nsAutoString prop;
        if (NS_OK == a->GetMediaTypes(prop)) {
          JSString *jsstring = JS_NewUCStringCopyN(cx, prop, prop.Length());
          // set the return value
          *vp = STRING_TO_JSVAL(jsstring);
        }
        else {
          return JS_FALSE;
        }
        break;
      }
      case CSSMEDIARULE_RULES:
      {
        nsIDOMCSSStyleRuleCollection* prop;
        if (NS_OK == a->GetRules(&prop)) {
          // get the js object
          if (prop != nsnull) {
            nsIScriptObjectOwner *owner = nsnull;
            if (NS_OK == prop->QueryInterface(kIScriptObjectOwnerIID, (void**)&owner)) {
              JSObject *object = nsnull;
              nsIScriptContext *script_cx = (nsIScriptContext *)JS_GetContextPrivate(cx);
              if (NS_OK == owner->GetScriptObject(script_cx, (void**)&object)) {
                // set the return value
                *vp = OBJECT_TO_JSVAL(object);
              }
              NS_RELEASE(owner);
            }
            NS_RELEASE(prop);
          }
          else {
            *vp = JSVAL_NULL;
          }
        }
        else {
          return JS_FALSE;
        }
        break;
      }
      default:
      {
        nsIJSScriptObject *object;
        if (NS_OK == a->QueryInterface(kIJSScriptObjectIID, (void**)&object)) {
          PRBool rval;
          rval =  object->GetProperty(cx, id, vp);
          NS_RELEASE(object);
          return rval;
        }
      }
    }
  }
  else {
    nsIJSScriptObject *object;
    if (NS_OK == a->QueryInterface(kIJSScriptObjectIID, (void**)&object)) {
      PRBool rval;
      rval =  object->GetProperty(cx, id, vp);
      NS_RELEASE(object);
      return rval;
    }
  }

  return PR_TRUE;
}

/***********************************************************************/
//
// CSSMediaRule Properties Setter
//
PR_STATIC_CALLBACK(JSBool)
SetCSSMediaRuleProperty(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
  nsIDOMCSSMediaRule *a = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);

  // If there's no private data, this must be the prototype, so ignore
  if (nsnull == a) {
    return JS_TRUE;
  }

  if (JSVAL_IS_INT(id)) {
    switch(JSVAL_TO_INT(id)) {
      case CSSMEDIARULE_MEDIATYPES:
      {
        nsAutoString prop;
        JSString *jsstring;
        if ((jsstring = JS_ValueToString(cx, *vp)) != nsnull) {
          prop.SetString(JS_GetStringChars(jsstring));
        }
        else {
          prop.SetString((const char *)nsnull);
        }
      
        a->SetMediaTypes(prop);
        
        break;
      }
      default:
      {
        nsIJSScriptObject *object;
        if (NS_OK == a->QueryInterface(kIJSScriptObjectIID, (void**)&object)) {
          PRBool rval;
          rval =  object->SetProperty(cx, id, vp);
          NS_RELEASE(object);
          return rval;
        }
      }
    }
  }
  else {
    nsIJSScriptObject *object;
    if (NS_OK == a->QueryInterface(kIJSScriptObjectIID, (void**)&object)) {
      PRBool rval;
      rval =  object->SetProperty(cx, id, vp);
      NS_RELEASE(object);
      return rval;
    }
  }

  return PR_TRUE;
}


//
// CSSMediaRule finalizer
//
PR_STATIC_CALLBACK(void)
FinalizeCSSMediaRule(JSContext *cx, JSObject *obj)
{
  nsIDOMCSSMediaRule *a = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);
  
  if (nsnull != a) {
    // get the js object
    nsIScriptObjectOwner *owner = nsnull;
    if (NS_OK == a->QueryInterface(kIScriptObjectOwnerIID, (void**)&owner)) {
      owner->SetScriptObject(nsnull);
      NS_RELEASE(owner);
    }

    NS_RELEASE(a);
  }
}


//
// CSSMediaRule enumerate
//
PR_STATIC_CALLBACK(JSBool)
EnumerateCSSMediaRule(JSContext *cx, JSObject *obj)
{
  nsIDOMCSSMediaRule *a = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);
  
  if (nsnull != a) {
    // get the js object
    nsIJSScriptObject *object;
    if (NS_OK == a->QueryInterface(kIJSScriptObjectIID, (void**)&object)) {
      object->EnumerateProperty(cx);
      NS_RELEASE(object);
    }
  }
  return JS_TRUE;
}


//
// CSSMediaRule resolve
//
PR_STATIC_CALLBACK(JSBool)
ResolveCSSMediaRule(JSContext *cx, JSObject *obj, jsval id)
{
  nsIDOMCSSMediaRule *a = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);
  
  if (nsnull != a) {
    // get the js object
    nsIJSScriptObject *object;
    if (NS_OK == a->QueryInterface(kIJSScriptObjectIID, (void**)&object)) {
      object->Resolve(cx, id);
      NS_RELEASE(object);
    }
  }
  return JS_TRUE;
}


//
// Native method AddRule
//
PR_STATIC_CALLBACK(JSBool)
CSSMediaRuleAddRule(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
  nsIDOMCSSMediaRule *nativeThis = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);
  JSBool rBool = JS_FALSE;
  PRUint32 nativeRet;
  nsAutoString b0;
  nsAutoString b1;
  PRUint32 b2;

  *rval = JSVAL_NULL;

  // If there's no private data, this must be the prototype, so ignore
  if (nsnull == nativeThis) {
    return JS_TRUE;
  }

  if (argc >= 3) {

    JSString *jsstring0 = JS_ValueToString(cx, argv[0]);
    if (nsnull != jsstring0) {
      b0.SetString(JS_GetStringChars(jsstring0));
    }
    else {
      b0.SetString("");   // Should this really be null?? 
    }

    JSString *jsstring1 = JS_ValueToString(cx, argv[1]);
    if (nsnull != jsstring1) {
      b1.SetString(JS_GetStringChars(jsstring1));
    }
    else {
      b1.SetString("");   // Should this really be null?? 
    }

    if (!JS_ValueToInt32(cx, argv[2], (int32 *)&b2)) {
      JS_ReportError(cx, "Parameter must be a number");
      return JS_FALSE;
    }

    if (NS_OK != nativeThis->AddRule(b0, b1, b2, &nativeRet)) {
      return JS_FALSE;
    }

    *rval = INT_TO_JSVAL(nativeRet);
  }
  else {
    JS_ReportError(cx, "Function addRule requires 3 parameters");
    return JS_FALSE;
  }

  return JS_TRUE;
}


//
// Native method RemoveRule
//
PR_STATIC_CALLBACK(JSBool)
CSSMediaRuleRemoveRule(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
  nsIDOMCSSMediaRule *nativeThis = (nsIDOMCSSMediaRule*)JS_GetPrivate(cx, obj);
  JSBool rBool = JS_FALSE;
  PRUint32 b0;

  *rval = JSVAL_NULL;

  // If there's no private data, this must be the prototype, so ignore
  if (nsnull == nativeThis) {
    return JS_TRUE;
  }

  if (argc >= 1) {

    if (!JS_ValueToInt32(cx, argv[0], (int32 *)&b0)) {
      JS_ReportError(cx, "Parameter must be a number");
      return JS_FALSE;
    }

    if (NS_OK != nativeThis->RemoveRule(b0)) {
      return JS_FALSE;
    }

    *rval = JSVAL_VOID;
  }
  else {
    JS_ReportError(cx, "Function removeRule requires 1 parameters");
    return JS_FALSE;
  }

  return JS_TRUE;
}


/***********************************************************************/
//
// class for CSSMediaRule
//
JSClass CSSMediaRuleClass = {
  "CSSMediaRule", 
  JSCLASS_HAS_PRIVATE,
  JS_PropertyStub,
  JS_PropertyStub,
  GetCSSMediaRuleProperty,
  SetCSSMediaRuleProperty,
  EnumerateCSSMediaRule,
  ResolveCSSMediaRule,
  JS_ConvertStub,
  FinalizeCSSMediaRule
};


//
// CSSMediaRule class properties
//
static JSPropertySpec CSSMediaRuleProperties[] =
{
  {"mediaTypes",    CSSMEDIARULE_MEDIATYPES,    JSPROP_ENUMERATE},
  {"rules",    CSSMEDIARULE_RULES,    JSPROP_ENUMERATE | JSPROP_READONLY},
  {0}
};


//
// CSSMediaRule class methods
//
static JSFunctionSpec CSSMediaRuleMethods[] = 
{
  {"addRule",          CSSMediaRuleAddRule,     3},
  {"removeRule",          CSSMediaRuleRemoveRule,     1},
  {0}
};


//
// CSSMediaRule constructor
//
PR_STATIC_CALLBACK(JSBool)
CSSMediaRule(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
  return JS_FALSE;
}


//
// CSSMediaRule class initialization
//
nsresult NS_InitCSSMediaRuleClass(nsIScriptContext *aContext, void **aPrototype)
{
  JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
  JSObject *proto = nsnull;
  JSObject *constructor = nsnull;
  JSObject *parent_proto = nsnull;
  JSObject *global = JS_GetGlobalObject(jscontext);
  jsval vp;

  if ((PR_TRUE != JS_LookupProperty(jscontext, global, "CSSMediaRule", &vp)) ||
      !JSVAL_IS_OBJECT(vp) ||
      ((constructor = JSVAL_TO_OBJECT(vp)) == nsnull) ||
      (PR_TRUE != JS_LookupProperty(jscontext, JSVAL_TO_OBJECT(vp), "prototype", &vp)) || 
      !JSVAL_IS_OBJECT(vp)) {

    if (NS_OK != NS_InitCSSStyleRuleClass(aContext, (void **)&parent_proto)) {
      return NS_ERROR_FAILURE;
    }
    proto = JS_InitClass(jscontext,     // context
                         global,        // global object
                         parent_proto,  // parent proto 
                         &CSSMediaRuleClass,      // JSClass
                         CSSMediaRule,            // JSNative ctor
                         0,             // ctor args
                         CSSMediaRuleProperties,  // proto props
                         CSSMediaRuleMethods,     // proto funcs
                         nsnull,        // ctor props (static)
                         nsnull);       // ctor funcs (static)
    if (nsnull == proto) {
      return NS_ERROR_FAILURE;
    }

  }
  else if ((nsnull != constructor) && JSVAL_IS_OBJECT(vp)) {
    proto = JSVAL_TO_OBJECT(vp);
  }
  else {
    return NS_ERROR_FAILURE;
  }

  if (aPrototype) {
    *aPrototype = proto;
  }
  return NS_OK;
}


//
// Method for creating a new CSSMediaRule JavaScript object
//
extern "C" NS_DOM nsresult NS_NewScriptCSSMediaRule(nsIScriptContext *aContext, nsISupports *aSupports, nsISupports *aParent, void **aReturn)
{
  NS_PRECONDITION(nsnull != aContext && nsnull != aSupports && nsnull != aReturn, "null argument to NS_NewScriptCSSMediaRule");
  JSObject *proto;
  JSObject *parent;
  nsIScriptObjectOwner *owner;
  JSContext *jscontext = (JSContext *)aContext->GetNativeContext();
  nsresult result = NS_OK;
  nsIDOMCSSMediaRule *aCSSMediaRule;

  if (nsnull == aParent) {
    parent = nsnull;
  }
  else if (NS_OK == aParent->QueryInterface(kIScriptObjectOwnerIID, (void**)&owner)) {
    if (NS_OK != owner->GetScriptObject(aContext, (void **)&parent)) {
      NS_RELEASE(owner);
      return NS_ERROR_FAILURE;
    }
    NS_RELEASE(owner);
  }
  else {
    return NS_ERROR_FAILURE;
  }

  if (NS_OK != NS_InitCSSMediaRuleClass(aContext, (void **)&proto)) {
    return NS_ERROR_FAILURE;
  }

  result = aSupports->QueryInterface(kICSSMediaRuleIID, (void **)&aCSSMediaRule);
  if (NS_OK != result) {
    return result;
  }

  // create a js object for this class
  *aReturn = JS_NewObject(jscontext, &CSSMediaRuleClass, proto, parent);
  if (nsnull != *aReturn) {
    // connect the native object to the js object
    JS_SetPrivate(jscontext, (JSObject *)*aReturn, aCSSMediaRule);
  }
  else {
    NS_RELEASE(aCSSMediaRule);
    return NS_ERROR_FAILURE; 
  }

  return NS_OK;
}
